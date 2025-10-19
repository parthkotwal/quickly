from django.contrib import admin
from .models import Feed, Post, Flashcard, UserProfile

@admin.register(Feed)
class FeedAdmin(admin.ModelAdmin):
    list_display = ('topic', 'created_at', 'dynamodb_id')
    search_fields = ('topic', 'dynamodb_id')

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('feed', 'caption', 'order', 'created_at')
    list_filter = ('feed', 'created_at')
    ordering = ('feed', 'order')

@admin.register(Flashcard)
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('post', 'question', 'created_at')
    search_fields = ('question', 'answer')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('cognito_id', 'dynamodb_id', 'created_at')
    search_fields = ('cognito_id', 'dynamodb_id')
