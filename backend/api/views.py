import json
import boto3
import requests
import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# Initialize Bedrock client with credentials from environment
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

@api_view(['POST'])
def generate_feed(request):
    """
    Generate 5 educational posts about a topic using Meta Llama 3
    """
    try:
        topic = request.data.get('topic')
        if not topic:
            return Response(
                {'error': 'Topic is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create prompt for Llama to generate educational content
        prompt = f"""Generate 5 educational Instagram-style posts about "{topic}".
Each post should be fun, engaging, and teach something interesting.

Return ONLY a JSON array with exactly 5 objects. Each object must have:
- "text": A short, engaging caption (2-3 sentences) explaining a key concept
- "imageQuery": A 2-3 word search term for an image

Example:
[{{"text": "Neural networks mimic the human brain! They learn patterns from data.", "imageQuery": "neural network"}}, ...]

JSON array:"""

        # Call Bedrock with Meta Llama 3 (available without approval)
        request_body = {
            "prompt": prompt,
            "max_gen_len": 2048,
            "temperature": 0.5,
            "top_p": 0.9
        }

        response = bedrock_runtime.invoke_model(
            modelId='meta.llama3-70b-instruct-v1:0',
            body=json.dumps(request_body)
        )

        # Parse response
        response_body = json.loads(response['body'].read())
        content_text = response_body['generation']

        # Extract JSON array
        try:
            # Try to parse directly
            posts = json.loads(content_text.strip())
        except json.JSONDecodeError:
            # Extract JSON array from text
            start = content_text.find('[')
            end = content_text.rfind(']') + 1
            if start != -1 and end != 0:
                posts = json.loads(content_text[start:end])
            else:
                raise ValueError("Could not parse AI response as JSON")

        # Add image URLs and music to each post
        for post in posts:
            image_url = None

            # Try Google Custom Search
            google_api_key = os.getenv('GOOGLE_API_KEY')
            google_search_engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')

            print(f"DEBUG - Google API Key: {google_api_key[:10] if google_api_key else 'NOT SET'}...")
            print(f"DEBUG - Google Search Engine ID: {google_search_engine_id if google_search_engine_id else 'NOT SET'}")

            if google_api_key and google_search_engine_id:
                try:
                    google_url = f"https://www.googleapis.com/customsearch/v1?q={post['imageQuery']}&cx={google_search_engine_id}&key={google_api_key}&searchType=image&num=1&imgSize=large"
                    google_response = requests.get(google_url, timeout=5)

                    if google_response.status_code == 200:
                        google_data = google_response.json()
                        if google_data.get('items'):
                            image_url = google_data['items'][0]['link']
                            print(f"✓ Google Image: {post['imageQuery']}")
                except Exception as e:
                    print(f"Google Image Search error: {e}")

            # Try Bing Image Search if Google not configured
            if not image_url:
                bing_api_key = os.getenv('BING_API_KEY')
                if bing_api_key:
                    try:
                        bing_url = f"https://api.bing.microsoft.com/v7.0/images/search?q={post['imageQuery']}&count=1&imageType=Photo&aspect=Wide"
                        bing_response = requests.get(
                            bing_url,
                            headers={'Ocp-Apim-Subscription-Key': bing_api_key},
                            timeout=5
                        )

                        if bing_response.status_code == 200:
                            bing_data = bing_response.json()
                            if bing_data.get('value'):
                                image_url = bing_data['value'][0]['contentUrl']
                                print(f"✓ Bing Image: {post['imageQuery']}")
                    except Exception as e:
                        print(f"Bing Image Search error: {e}")

            if not image_url:
                raise ValueError("No image search API configured. Please add GOOGLE_API_KEY + GOOGLE_SEARCH_ENGINE_ID or BING_API_KEY to .env")

            post['imageUrl'] = image_url

            # For demo, use a default music placeholder
            post['musicUrl'] = "https://example.com/music/default.mp3"
            post['musicTitle'] = "Background Music"

        return Response({
            'topic': topic,
            'posts': posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'healthy'}, status=status.HTTP_200_OK)
