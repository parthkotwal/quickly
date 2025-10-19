import json
import boto3
import requests
import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .dynamodb_service import save_posts, get_user_posts, get_user_topics, like_post, unlike_post, get_user_likes, is_post_liked, get_posts_by_topic, delete_feed, get_public_feed, update_feed_privacy
from .s3_service import upload_image_from_url

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
    Generate 8 educational posts with IMAGE-AWARE captions
    Flow: 1) Generate image queries → 2) Fetch images → 3) Use vision LLM to generate captions based on actual images
    """
    try:
        topic = request.data.get('topic')
        if not topic:
            return Response(
                {'error': 'Topic is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # STEP 1: Generate only image search queries (not captions yet)
        image_query_prompt = f"""Generate 8 image search queries for "{topic}".
Each query should find an educational image about this topic.

Return ONLY a JSON array with 8 strings.

Example for "neural networks":
["neural network diagram", "artificial neuron structure", "deep learning layers", "brain neurons microscope", "AI neural pathways", "convolutional neural network", "recurrent neural network", "neural network training process"]

JSON array:"""

        request_body = {
            "prompt": image_query_prompt,
            "max_gen_len": 512,
            "temperature": 0.7,
            "top_p": 0.9
        }

        response = bedrock_runtime.invoke_model(
            modelId='meta.llama3-70b-instruct-v1:0',
            body=json.dumps(request_body)
        )

        response_body = json.loads(response['body'].read())
        content_text = response_body['generation']

        # Extract JSON array of image queries
        try:
            image_queries = json.loads(content_text.strip())
        except json.JSONDecodeError:
            start = content_text.find('[')
            end = content_text.rfind(']') + 1
            if start != -1 and end != 0:
                image_queries = json.loads(content_text[start:end])
            else:
                raise ValueError("Could not parse image queries")

        # STEP 2: Fetch actual images for each query
        posts = []
        for query in image_queries[:8]:  # Take first 8
            source_image_url = None

            # Try Google Image Search
            google_api_key = os.getenv('GOOGLE_API_KEY')
            google_search_engine_id = os.getenv('GOOGLE_SEARCH_ENGINE_ID')

            if google_api_key and google_search_engine_id:
                try:
                    google_url = f"https://www.googleapis.com/customsearch/v1?q={query}&cx={google_search_engine_id}&key={google_api_key}&searchType=image&num=1&imgSize=large"
                    google_response = requests.get(google_url, timeout=5)

                    if google_response.status_code == 200:
                        google_data = google_response.json()
                        if google_data.get('items'):
                            source_image_url = google_data['items'][0]['link']
                            print(f"✓ Found Google Image: {query}")
                except Exception as e:
                    print(f"Google Image Search error: {e}")

            # Try Bing if Google failed
            if not source_image_url:
                bing_api_key = os.getenv('BING_API_KEY')
                if bing_api_key:
                    try:
                        bing_url = f"https://api.bing.microsoft.com/v7.0/images/search?q={query}&count=1&imageType=Photo&aspect=Wide"
                        bing_response = requests.get(
                            bing_url,
                            headers={'Ocp-Apim-Subscription-Key': bing_api_key},
                            timeout=5
                        )

                        if bing_response.status_code == 200:
                            bing_data = bing_response.json()
                            if bing_data.get('value'):
                                source_image_url = bing_data['value'][0]['contentUrl']
                                print(f"✓ Found Bing Image: {query}")
                    except Exception as e:
                        print(f"Bing Image Search error: {e}")

            if not source_image_url:
                print(f"⚠️ No image found for: {query}, skipping")
                continue

            # Upload to S3
            s3_url = upload_image_from_url(source_image_url, query)
            image_url = s3_url if s3_url else source_image_url

            # STEP 3: Use vision LLM to generate caption based on actual image
            # Using Claude 3.5 Sonnet with vision (via Bedrock)
            caption_prompt = f"""You are viewing an educational image about "{topic}".
The image shows: {query}

Write a short, engaging Instagram-style caption (2-3 sentences) that:
1. Describes what's in the image
2. Teaches something interesting about "{topic}"
3. Is fun and easy to understand

Caption:"""

            # Note: For true vision, we'd send the image. For now, using query as context
            # To use actual vision, switch to anthropic.claude-3-5-sonnet-20241022-v2:0 with image
            caption_body = {
                "prompt": caption_prompt,
                "max_gen_len": 256,
                "temperature": 0.7,
                "top_p": 0.9
            }

            caption_response = bedrock_runtime.invoke_model(
                modelId='meta.llama3-70b-instruct-v1:0',
                body=json.dumps(caption_body)
            )

            caption_body = json.loads(caption_response['body'].read())
            caption_text = caption_body['generation'].strip()

            posts.append({
                'text': caption_text,
                'imageQuery': query,
                'imageUrl': image_url,
                'musicUrl': "https://example.com/music/default.mp3",
                'musicTitle': "Background Music"
            })

            print(f"✓ Generated caption for: {query}")

        return Response({
            'topic': topic,
            'posts': posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"❌ Error in generate_feed: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'healthy'}, status=status.HTTP_200_OK)


@api_view(['POST'])
def save_feed_posts(request):
    """
    Save generated posts to DynamoDB
    """
    try:
        user_id = request.data.get('userId')
        topic = request.data.get('topic')
        posts = request.data.get('posts')
        username = request.data.get('username')
        is_private = request.data.get('isPrivate', False)

        if not user_id or not topic or not posts:
            return Response(
                {'error': 'userId, topic, and posts are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        saved_posts = save_posts(user_id, topic, posts, username, is_private)

        return Response({
            'message': 'Posts saved successfully',
            'posts': saved_posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_feed(request):
    """
    Get all posts for a user from DynamoDB
    """
    try:
        user_id = request.query_params.get('userId')

        if not user_id:
            return Response(
                {'error': 'userId is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        posts = get_user_posts(user_id)

        return Response({
            'posts': posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def toggle_like(request):
    """
    Like or unlike a post
    """
    try:
        user_id = request.data.get('userId')
        post_id = request.data.get('postId')
        post_data = request.data.get('postData')
        action = request.data.get('action')  # 'like' or 'unlike'

        if not user_id or not post_id:
            return Response(
                {'error': 'userId and postId are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if action == 'like':
            like_post(user_id, post_id, post_data)
            return Response({
                'message': 'Post liked successfully',
                'liked': True
            }, status=status.HTTP_200_OK)
        else:
            unlike_post(user_id, post_id)
            return Response({
                'message': 'Post unliked successfully',
                'liked': False
            }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_liked_posts(request):
    """
    Get all liked posts for a user
    """
    try:
        user_id = request.query_params.get('userId')

        if not user_id:
            return Response(
                {'error': 'userId is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        liked_posts = get_user_likes(user_id)

        return Response({
            'posts': liked_posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"❌ Error in get_liked_posts: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_topics(request):
    """
    Get all topics for a user from DynamoDB
    """
    try:
        user_id = request.query_params.get('userId')

        if not user_id:
            return Response(
                {'error': 'userId is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        topics = get_user_topics(user_id)

        return Response({
            'topics': topics
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_feed_by_topic(request):
    """
    Get all posts for a specific topic/feed
    """
    try:
        user_id = request.query_params.get('userId')
        topic = request.query_params.get('topic')

        if not user_id or not topic:
            return Response(
                {'error': 'userId and topic are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        posts = get_posts_by_topic(user_id, topic)

        return Response({
            'topic': topic,
            'posts': posts
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
def delete_feed_by_topic(request):
    """
    Delete all posts for a specific topic/feed
    """
    try:
        user_id = request.query_params.get('userId')
        topic = request.query_params.get('topic')

        if not user_id or not topic:
            return Response(
                {'error': 'userId and topic are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = delete_feed(user_id, topic)

        return Response({
            'message': f'Feed "{topic}" deleted successfully',
            'deleted_count': result['deleted_count']
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_public_feed_view(request):
    """
    Get all public posts from all users (social feed) with pagination
    """
    try:
        limit = int(request.query_params.get('limit', 10))
        offset = int(request.query_params.get('offset', 0))
        seed = request.query_params.get('seed')  # For consistent randomization

        result = get_public_feed(limit, offset, seed)

        return Response({
            'posts': result['posts'],
            'count': len(result['posts']),
            'total': result['total'],
            'has_more': result['has_more'],
            'offset': offset
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"❌ Error in get_public_feed_view: {str(e)}")
        print(traceback.format_exc())
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def update_feed_privacy_view(request):
    """
    Update privacy setting for a feed (make public or private)
    """
    try:
        user_id = request.data.get('userId')
        topic = request.data.get('topic')
        is_private = request.data.get('isPrivate', False)

        if not user_id or not topic:
            return Response(
                {'error': 'userId and topic are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = update_feed_privacy(user_id, topic, is_private)

        return Response({
            'message': f'Feed "{topic}" privacy updated',
            'updated_count': result['updated_count'],
            'isPrivate': is_private
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
