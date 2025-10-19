#!/usr/bin/env python3
"""
Script to view DynamoDB data for a specific user
Usage: python view_user_data.py <firebase-user-id>
"""

import sys
import json
from api.dynamodb_service import get_user_posts, get_user_topics, get_user_likes

def main():
    if len(sys.argv) < 2:
        print("Usage: python view_user_data.py <firebase-user-id>")
        print("\nExample: python view_user_data.py abc123xyz")
        sys.exit(1)

    user_id = sys.argv[1]

    print(f"\n🔍 Fetching data for user: {user_id}\n")

    # Get all posts
    print("=" * 60)
    print("📝 POSTS:")
    print("=" * 60)
    posts = get_user_posts(user_id)

    if posts:
        for i, post in enumerate(posts, 1):
            print(f"\n[Post {i}]")
            print(f"  Topic: {post.get('topic')}")
            print(f"  Post ID: {post.get('postId')}")
            print(f"  Text: {post.get('text')[:80]}...")
            print(f"  Image URL: {post.get('imageUrl', 'N/A')[:60]}...")
            print(f"  Created: {post.get('createdAt')}")
            print(f"  Likes: {post.get('likes', 0)}")
    else:
        print("  No posts found")

    print(f"\n  Total posts: {len(posts)}")

    # Get topics
    print("\n" + "=" * 60)
    print("📚 TOPICS:")
    print("=" * 60)
    topics = get_user_topics(user_id)

    if topics:
        for i, topic in enumerate(topics, 1):
            print(f"  {i}. {topic}")
    else:
        print("  No topics found")

    print(f"\n  Total topics: {len(topics)}")

    # Get liked posts
    print("\n" + "=" * 60)
    print("❤️  LIKED POSTS:")
    print("=" * 60)
    liked_posts = get_user_likes(user_id)

    if liked_posts:
        for i, post in enumerate(liked_posts, 1):
            print(f"\n[Liked Post {i}]")
            print(f"  Topic: {post.get('topic')}")
            print(f"  Text: {post.get('text')[:80]}...")
    else:
        print("  No liked posts found")

    print(f"\n  Total liked posts: {len(liked_posts)}")

    print("\n" + "=" * 60)
    print("✅ Query complete!")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
