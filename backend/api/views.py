from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from .models import Feed, Post, Flashcard, UserProfile
from .ai_pipeline.feed_generator import FeedGenerator
from .dynamodb import DynamoDBClient
from asgiref.sync import async_to_sync
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class GenerateFeedView(APIView):
    def __init__(self):
        super().__init__()
        self.dynamodb = DynamoDBClient()

    def post(self, request):
        topic = request.data.get('topic')
        if not topic:
            return Response({'error': 'Topic is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Check cache
            cache_key = f"feed_{topic.lower().replace(' ', '_')}"
            cached_feed = cache.get(cache_key)
            if cached_feed:
                return Response(cached_feed, status=status.HTTP_200_OK)

            generator = FeedGenerator()
            feed_content = async_to_sync(generator.generate_feed)(topic)

            # Create Feed in Django
            feed = Feed.objects.create(
                topic=topic,
                dynamodb_id=str(feed.id)
            )

            # Create corresponding record in DynamoDB
            feed_data = {
                "dynamodb_id": str(feed.id),
                "topic": topic,
                "user_dynamodb_id": (
                    str(UserProfile.objects.get(cognito_id=request.user.id).dynamodb_id)
                    if request.user.is_authenticated else "anonymous"
                ),
                "created_at": datetime.now(datetime.timezone.utc),
                "views": 0,
                "likes": 0,
                "shares": 0
            }
            self.dynamodb.create_feed(feed_data)

            posts = []
            for idx, post_content in enumerate(feed_content):
                post = Post.objects.create(
                    feed=feed,
                    caption=post_content['caption'],
                    image_url=post_content['image_url'],
                    image_prompt=post_content['image_prompt'],
                    order=idx
                )

                flashcard = Flashcard.objects.create(
                    post=post,
                    question=post_content['flashcard']['question'],
                    answer=post_content['flashcard']['answer']
                )

                posts.append({
                    'id': str(post.id),
                    'caption': post.caption,
                    'image_url': post.image_url,
                    'flashcard': {
                        'question': flashcard.question,
                        'answer': flashcard.answer
                    }
                })

            self.dynamodb.append_posts_to_feed(str(feed.id), posts)

            response_data = {
                'feed_id': str(feed.id),
                'topic': feed.topic,
                'posts': posts
            }

            # Cache for 1 hour
            cache.set(cache_key, response_data, timeout=3600)

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Unexpected error in feed generation: {str(e)}")
            if 'feed' in locals():
                feed.delete()
            return Response(
                {'error': 'An unexpected error occurred'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FeedListView(APIView):
    def get(self, request):
        try:
            if request.user.is_authenticated:
                feeds = Feed.objects.filter(userprofile__cognito_id=request.user.id)
            else:
                feeds = Feed.objects.all()

            data = [{
                'id': str(feed.id),
                'topic': feed.topic,
                'created_at': feed.created_at,
                'post_count': feed.posts.count()
            } for feed in feeds]

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving feeds: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve feeds'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FeedDetailView(APIView):
    def __init__(self):
        super().__init__()
        self.dynamodb = DynamoDBClient()

    def get(self, request, feed_id):
        try:
            cache_key = f"feed_detail_{feed_id}"
            cached_feed = cache.get(cache_key)
            if cached_feed:
                self._update_analytics(feed_id)
                return Response(cached_feed, status=status.HTTP_200_OK)

            try:
                feed = Feed.objects.get(id=feed_id)
            except Feed.DoesNotExist:
                return Response(
                    {'error': 'Feed not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Authorization check
            if request.user.is_authenticated:
                if not UserProfile.objects.filter(
                    cognito_id=request.user.id,
                    feeds=feed
                ).exists():
                    return Response(
                        {'error': 'Not authorized to view this feed'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            response_data = {
                'id': str(feed.id),
                'topic': feed.topic,
                'created_at': feed.created_at,
                'posts': [{
                    'id': str(post.id),
                    'caption': post.caption,
                    'image_url': post.image_url,
                    'flashcard': {
                        'question': post.flashcard.question,
                        'answer': post.flashcard.answer
                    }
                } for post in feed.posts.all().order_by('order')]
            }

            cache.set(cache_key, response_data, timeout=3600)
            self._update_analytics(feed_id)

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving feed detail: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve feed details'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _update_analytics(self, feed_id):
        try:
            self.dynamodb.update_feed_views(feed_id)
        except Exception as e:
            logger.warning(f"Failed to update analytics: {e}")
