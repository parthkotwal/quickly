from django.db import models
import uuid


class Feed(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    dynamodb_id = models.CharField(max_length=255, unique=True)  # Reference to DynamoDB record
    
    class Meta:
        ordering = ['-created_at']

class Post(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feed = models.ForeignKey(Feed, on_delete=models.CASCADE, related_name='posts')
    caption = models.TextField()
    image_url = models.URLField()  # S3 URL for the image
    image_prompt = models.TextField()  # Prompt used to search/generate image
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.IntegerField()  # Position in feed
    
    class Meta:
        ordering = ['order']

class Flashcard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.OneToOneField(Post, on_delete=models.CASCADE, related_name='flashcard')
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cognito_id = models.CharField(max_length=255, unique=True)  # AWS Cognito user ID
    dynamodb_id = models.CharField(max_length=255, unique=True)  # Reference to DynamoDB record
    created_at = models.DateTimeField(auto_now_add=True)
