from django.contrib import admin
from .models import FeedSession, CachedFeed, Post, Flashcard, QueryLog

admin.site.register(FeedSession)
admin.site.register(CachedFeed)
admin.site.register(Post)
admin.site.register(Flashcard)
admin.site.register(QueryLog)
