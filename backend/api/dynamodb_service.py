import boto3
import os
from datetime import datetime
from decimal import Decimal
import json

# Initialize DynamoDB client
dynamodb = boto3.resource(
    'dynamodb',
    region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

# Table names - customize these in .env if needed
POSTS_TABLE = os.getenv('DYNAMODB_POSTS_TABLE', 'quickly-posts')
LIKES_TABLE = os.getenv('DYNAMODB_LIKES_TABLE', 'quickly-likes')
USERS_TABLE = os.getenv('DYNAMODB_USERS_TABLE', 'quickly-users')

def get_posts_table():
    """Get or create posts table"""
    try:
        table = dynamodb.Table(POSTS_TABLE)
        table.load()
        return table
    except:
        # Table doesn't exist, create it
        table = dynamodb.create_table(
            TableName=POSTS_TABLE,
            KeySchema=[
                {'AttributeName': 'userId', 'KeyType': 'HASH'},  # Partition key
                {'AttributeName': 'postId', 'KeyType': 'RANGE'}  # Sort key
            ],
            AttributeDefinitions=[
                {'AttributeName': 'userId', 'AttributeType': 'S'},
                {'AttributeName': 'postId', 'AttributeType': 'S'},
                {'AttributeName': 'topic', 'AttributeType': 'S'},
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'topic-index',
                    'KeySchema': [
                        {'AttributeName': 'topic', 'KeyType': 'HASH'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        table.wait_until_exists()
        return table

def get_likes_table():
    """Get or create likes table"""
    try:
        table = dynamodb.Table(LIKES_TABLE)
        table.load()
        return table
    except:
        # Table doesn't exist, create it
        table = dynamodb.create_table(
            TableName=LIKES_TABLE,
            KeySchema=[
                {'AttributeName': 'userId', 'KeyType': 'HASH'},  # Partition key
                {'AttributeName': 'postId', 'KeyType': 'RANGE'}  # Sort key
            ],
            AttributeDefinitions=[
                {'AttributeName': 'userId', 'AttributeType': 'S'},
                {'AttributeName': 'postId', 'AttributeType': 'S'},
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )
        table.wait_until_exists()
        return table

def save_posts(user_id, topic, posts, username=None, is_private=False):
    """Save generated posts to DynamoDB"""
    table = get_posts_table()

    saved_posts = []
    timestamp = datetime.now().timestamp()

    for i, post in enumerate(posts):
        post_id = f"{topic}_{timestamp}_{i}"

        item = {
            'userId': user_id,
            'postId': post_id,
            'topic': topic,
            'username': username or user_id[:8],  # Use first 8 chars of userId if no username
            'isPrivate': is_private,
            'text': post['text'],
            'imageUrl': post['imageUrl'],
            'imageQuery': post.get('imageQuery', ''),
            'musicUrl': post.get('musicUrl', ''),
            'musicTitle': post.get('musicTitle', ''),
            'likes': 0,
            'comments': 0,
            'shares': 0,
            'createdAt': datetime.now().isoformat(),
        }

        table.put_item(Item=item)
        saved_posts.append(item)

    return saved_posts

def get_user_posts(user_id):
    """Get all posts for a user (excluding deleted ones)"""
    table = get_posts_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )

    posts = response.get('Items', [])

    # Filter out posts marked as deleted by creator
    active_posts = [p for p in posts if not p.get('deletedByCreator', False)]

    return active_posts

def get_public_feed(limit=50):
    """Get all public posts from all users - fully randomized"""
    table = get_posts_table()

    # Scan table for public posts (isPrivate = False or not set)
    # AND not deleted by creator
    response = table.scan(
        FilterExpression='(attribute_not_exists(isPrivate) OR isPrivate = :false) AND (attribute_not_exists(deletedByCreator) OR deletedByCreator = :false)',
        ExpressionAttributeValues={
            ':false': False
        }
    )

    posts = response.get('Items', [])

    # Fully randomize - like TikTok For You Page
    import random

    # Shuffle all public posts randomly
    random.shuffle(posts)

    # Return limited number
    return posts[:limit]

def get_user_topics(user_id):
    """Get unique topics for a user (excluding deleted ones)"""
    table = get_posts_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )

    posts = response.get('Items', [])

    # Filter out posts marked as deleted by creator
    active_posts = [p for p in posts if not p.get('deletedByCreator', False)]

    # Extract unique topics from active posts only
    topics = list(set(post.get('topic') for post in active_posts if post.get('topic')))

    # Sort by most recent (based on createdAt)
    topic_dates = {}
    for post in active_posts:
        topic = post.get('topic')
        created_at = post.get('createdAt', '')
        if topic and (topic not in topic_dates or created_at > topic_dates[topic]):
            topic_dates[topic] = created_at

    # Sort topics by most recent first
    sorted_topics = sorted(topics, key=lambda t: topic_dates.get(t, ''), reverse=True)

    return sorted_topics

def like_post(user_id, post_id, post_data):
    """Like a post"""
    table = get_likes_table()

    item = {
        'userId': user_id,
        'postId': post_id,
        'post': post_data,  # Store the entire post for easy retrieval
        'likedAt': datetime.now().isoformat(),
    }

    table.put_item(Item=item)
    return True

def unlike_post(user_id, post_id):
    """Unlike a post"""
    table = get_likes_table()

    table.delete_item(
        Key={
            'userId': user_id,
            'postId': post_id
        }
    )
    return True

def get_user_likes(user_id):
    """Get all liked posts for a user"""
    table = get_likes_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )

    return [item['post'] for item in response.get('Items', [])]

def is_post_liked(user_id, post_id):
    """Check if user has liked a post"""
    table = get_likes_table()

    response = table.get_item(
        Key={
            'userId': user_id,
            'postId': post_id
        }
    )

    return 'Item' in response

def get_posts_by_topic(user_id, topic):
    """Get all posts for a specific topic (excluding deleted ones)"""
    table = get_posts_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        FilterExpression='topic = :topic AND (attribute_not_exists(deletedByCreator) OR deletedByCreator = :false)',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':topic': topic,
            ':false': False
        }
    )

    return response.get('Items', [])

def delete_feed(user_id, topic):
    """Mark posts as deleted by creator (soft delete - stays in DB for others to see)"""
    table = get_posts_table()

    # First, get all posts for this topic
    posts = get_posts_by_topic(user_id, topic)

    # Mark each post as deleted by creator (soft delete)
    deleted_count = 0
    for post in posts:
        table.update_item(
            Key={
                'userId': user_id,
                'postId': post['postId']
            },
            UpdateExpression='SET deletedByCreator = :true',
            ExpressionAttributeValues={
                ':true': True
            }
        )
        deleted_count += 1

    return {
        'deleted_count': deleted_count,
        'topic': topic
    }

def update_feed_privacy(user_id, topic, is_private):
    """Update privacy setting for all posts in a topic"""
    table = get_posts_table()

    # Get all posts for this topic
    posts = get_posts_by_topic(user_id, topic)

    # Update each post
    updated_count = 0
    for post in posts:
        table.update_item(
            Key={
                'userId': user_id,
                'postId': post['postId']
            },
            UpdateExpression='SET isPrivate = :private',
            ExpressionAttributeValues={
                ':private': is_private
            }
        )
        updated_count += 1

    return {
        'updated_count': updated_count,
        'topic': topic,
        'isPrivate': is_private
    }
