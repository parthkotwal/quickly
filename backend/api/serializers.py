from rest_framework import serializers
from .models import FeedSession, CachedFeed, Post, Flashcard, QueryLog

class FeedSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedSession
        fields = '__all__'

class CachedFeedSerializer(serializers.ModelSerializer):
    class Meta:
        model = CachedFeed
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = '__all__'

class FlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = '__all__'

class QueryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryLog
        fields = '__all__'
