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
            # For demo, use placeholder images
            # In production, integrate with Unsplash API or Google Custom Search
            post['imageUrl'] = f"https://source.unsplash.com/800x600/?{post['imageQuery'].replace(' ', ',')}"
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
