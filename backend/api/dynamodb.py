import boto3
from botocore.config import Config
from boto3.dynamodb.conditions import Key
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DynamoDBClient:
    def __init__(self):
        self.dynamodb = boto3.resource(
            "dynamodb",
            region_name=settings.AWS_DEFAULT_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(retries={"max_attempts": 3})
        )

        # Table names — be sure they match what you created in the AWS Console
        self.USERS_TABLE = "Users"
        self.FEEDS_TABLE = "Feeds"

        self.users_table = self.dynamodb.Table(self.USERS_TABLE)
        self.feeds_table = self.dynamodb.Table(self.FEEDS_TABLE)

    # ---------- USER METHODS ----------

    def create_user(self, user_data):
        """Create a new user record"""
        try:
            response = self.users_table.put_item(Item=user_data)
            return response
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to create user: {e}")
            raise

    def get_user_by_cognito(self, cognito_id):
        """Retrieve user data by Cognito ID via GSI"""
        try:
            response = self.users_table.query(
                IndexName="cognito_id-index",
                KeyConditionExpression=Key("cognito_id").eq(cognito_id)
            )
            items = response.get("Items", [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to fetch user: {e}")
            raise

    # ---------- FEED METHODS ----------

    def create_feed(self, feed_data):
        """Create a feed record"""
        try:
            response = self.feeds_table.put_item(Item=feed_data)
            return response
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to create feed: {e}")
            raise

    def get_feed(self, dynamodb_id):
        """Retrieve feed record"""
        try:
            response = self.feeds_table.get_item(Key={"dynamodb_id": dynamodb_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to fetch feed: {e}")
            raise

    def append_posts_to_feed(self, dynamodb_id, posts):
        """Update a feed to include generated posts"""
        try:
            response = self.feeds_table.update_item(
                Key={"dynamodb_id": dynamodb_id},
                UpdateExpression="SET posts = :posts",
                ExpressionAttributeValues={":posts": posts},
                ReturnValues="UPDATED_NEW"
            )
            return response
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to append posts: {e}")
            raise

    def update_feed_views(self, dynamodb_id):
        """Increment view counter when a feed is accessed"""
        try:
            response = self.feeds_table.update_item(
                Key={"dynamodb_id": dynamodb_id},
                UpdateExpression="SET views = if_not_exists(views, :zero) + :inc, last_viewed = :timestamp",
                ExpressionAttributeValues={
                    ":inc": 1,
                    ":zero": 0,
                    ":timestamp": settings.NOW_FUNC()
                },
                ReturnValues="UPDATED_NEW"
            )
            return response
        except Exception as e:
            logger.warning(f"[DynamoDB] Failed to update feed analytics: {e}")
            return None

    def get_user_feeds(self, user_dynamodb_id):
        """Fetch all feeds belonging to a specific user"""
        try:
            response = self.feeds_table.query(
                IndexName="user_dynamodb_id-index",
                KeyConditionExpression=Key("user_dynamodb_id").eq(user_dynamodb_id)
            )
            return response.get("Items", [])
        except Exception as e:
            logger.error(f"[DynamoDB] Failed to fetch user feeds: {e}")
            raise
