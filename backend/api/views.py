from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils.crypto import get_random_string
from django.core.cache import cache
from .models import FeedSession, CachedFeed, Post, Flashcard, QueryLog
from .serializers import PostSerializer, FlashcardSerializer

# Helper: get or create session
def get_or_create_session(token=None):
    if token:
        session, _ = FeedSession.objects.get_or_create(token=token)
    else:
        token = get_random_string(32)
        session = FeedSession.objects.create(token=token)
    return session

class GenerateFeedView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        topic = request.data.get('topic')
        token = request.data.get('token')
        session = get_or_create_session(token)
        cache_key = f"feed_{session.token}_{topic}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        posts = [{
            "content": f"Post about {topic}",
            "image_url": "https://example.com/image.jpg",
            "audio_url": "https://example.com/audio.mp3"
        }]
        post_objs = [Post.objects.create(session=session, **post) for post in posts]
        serialized = PostSerializer(post_objs, many=True).data
        cache.set(cache_key, serialized, timeout=300)
        QueryLog.objects.create(query=topic, response=serialized)
        return Response({"token": session.token, "posts": serialized})

class ContinueFeedView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        query = request.data.get('query')
        token = request.data.get('token')
        session = get_or_create_session(token)
        posts = [{
            "content": f"Continued post for query: {query}",
            "image_url": "https://example.com/image2.jpg",
            "audio_url": "https://example.com/audio2.mp3"
        }]
        post_objs = [Post.objects.create(session=session, **post) for post in posts]
        serialized = PostSerializer(post_objs, many=True).data
        QueryLog.objects.create(query=query, response=serialized)
        return Response({"token": session.token, "posts": serialized})

class FlashcardView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        topic = request.data.get('topic')
        token = request.data.get('token')
        session = get_or_create_session(token)
        cards = [
            {"front": f"What is {topic}?", "back": f"Explanation of {topic}"},
            {"front": f"Key fact about {topic}", "back": "Some fact."}
        ]
        flashcard = Flashcard.objects.create(session=session, topic=topic, cards=cards)
        serialized = FlashcardSerializer(flashcard).data
        QueryLog.objects.create(query=topic, response=serialized)
        return Response({"token": session.token, "flashcards": serialized['cards']})

# Example requests/responses in comments
# POST /generate_feed/ {"topic": "AI"} => {"token": "...", "posts": [{...}]}
# POST /continue_feed/ {"token": "...", "query": "latest trends"} => {"token": "...", "posts": [{...}]}
# POST /flashcard/ {"topic": "AI"} => {"token": "...", "flashcards": [{...}]}
