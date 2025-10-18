from django.db import models

# FeedSession stores session tokens and context
class FeedSession(models.Model):
    token = models.CharField(max_length=64, unique=True)
    context = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

# CachedFeed stores cached results for quick reloads
class CachedFeed(models.Model):
    session = models.ForeignKey(FeedSession, on_delete=models.CASCADE)
    endpoint = models.CharField(max_length=32)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

# Post stores generated posts with optional image/audio URLs
class Post(models.Model):
    session = models.ForeignKey(FeedSession, on_delete=models.CASCADE)
    content = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    audio_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Flashcard stores flashcard sets for a topic
class Flashcard(models.Model):
    session = models.ForeignKey(FeedSession, on_delete=models.CASCADE)
    topic = models.CharField(max_length=128)
    cards = models.JSONField()  # {"front": "...", "back": "..."}
    created_at = models.DateTimeField(auto_now_add=True)

# For admin/debugging
class QueryLog(models.Model):
    query = models.TextField()
    response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
