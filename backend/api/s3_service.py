import boto3
import os
import requests
from datetime import datetime
import hashlib
from botocore.exceptions import ClientError
from django.core.files.uploadedfile import InMemoryUploadedFile
from botocore.exceptions import NoCredentialsError
import uuid
from dotenv import load_dotenv

load_dotenv()

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'),
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)
BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'quickly-images')
S3_REGION = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')

def create_bucket_if_not_exists():
    """Create S3 bucket if it doesn't exist"""
    try:
        # Check if bucket exists
        s3_client.head_bucket(Bucket=BUCKET_NAME)
        print(f"✓ S3 bucket '{BUCKET_NAME}' already exists")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            # Bucket doesn't exist, create it
            try:
                if S3_REGION == 'us-east-1':
                    # us-east-1 doesn't need LocationConstraint
                    s3_client.create_bucket(Bucket=BUCKET_NAME)
                else:
                    s3_client.create_bucket(
                        Bucket=BUCKET_NAME,
                        CreateBucketConfiguration={'LocationConstraint': S3_REGION}
                    )

                # Make bucket public read (so images can be displayed)
                s3_client.put_public_access_block(
                    Bucket=BUCKET_NAME,
                    PublicAccessBlockConfiguration={
                        'BlockPublicAcls': False,
                        'IgnorePublicAcls': False,
                        'BlockPublicPolicy': False,
                        'RestrictPublicBuckets': False
                    }
                )

                # Add bucket policy for public read
                bucket_policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
                        }
                    ]
                }

                s3_client.put_bucket_policy(
                    Bucket=BUCKET_NAME,
                    Policy=str(bucket_policy).replace("'", '"')
                )

                print(f"✓ Created S3 bucket '{BUCKET_NAME}'")
                return True
            except Exception as create_error:
                print(f"Error creating S3 bucket: {create_error}")
                return False
        else:
            print(f"Error accessing S3 bucket: {e}")
            return False

def upload_image_from_url(image_url, image_query):
    """
    Download image from URL and upload to S3
    Returns the S3 URL
    """
    try:
        # Ensure bucket exists
        create_bucket_if_not_exists()

        # Download image from URL
        print(f"Downloading image from: {image_url[:50]}...")
        response = requests.get(image_url, timeout=10, stream=True)

        if response.status_code != 200:
            print(f"Failed to download image: {response.status_code}")
            return None

        # Get content type
        content_type = response.headers.get('Content-Type', 'image/jpeg')

        # Determine file extension
        if 'jpeg' in content_type or 'jpg' in content_type:
            ext = 'jpg'
        elif 'png' in content_type:
            ext = 'png'
        elif 'gif' in content_type:
            ext = 'gif'
        elif 'webp' in content_type:
            ext = 'webp'
        else:
            ext = 'jpg'  # default

        # Create unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # Hash the query to avoid special characters
        query_hash = hashlib.md5(image_query.encode()).hexdigest()[:8]
        filename = f"posts/{timestamp}_{query_hash}.{ext}"

        # Upload to S3 (bucket policy handles public access, no ACL needed)
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=filename,
            Body=response.content,
            ContentType=content_type
        )

        # Generate S3 URL
        s3_url = f"https://{BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{filename}"

        print(f"✓ Uploaded to S3: {filename}")
        return s3_url

    except requests.exceptions.RequestException as e:
        print(f"Error downloading image: {e}")
        return None
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return None

def delete_image(s3_url):
    """Delete an image from S3 given its URL"""
    try:
        # Extract filename from URL
        filename = s3_url.split(f"{BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/")[-1]

        s3_client.delete_object(
            Bucket=BUCKET_NAME,
            Key=filename
        )

        print(f"✓ Deleted from S3: {filename}")
        return True
    except Exception as e:
        print(f"Error deleting from S3: {e}")
        return False
def upload_image_file(file_obj: InMemoryUploadedFile, user_id: str):
    """
    Upload a local image file (from React Native FormData) to S3.
    Returns the public S3 URL.
    """
    try:
        # Ensure bucket exists
        create_bucket_if_not_exists()

        # Generate unique file name
        file_extension = file_obj.name.split('.')[-1]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"user_uploads/{user_id}/{timestamp}_{uuid.uuid4()}.{file_extension}"

        # Upload file object
        s3_client.upload_fileobj(
            file_obj,
            BUCKET_NAME,
            filename,
            ExtraArgs={
                'ContentType': file_obj.content_type,
            }
        )

        s3_url = f"https://{BUCKET_NAME}.s3.{S3_REGION}.amazonaws.com/{filename}"
        print(f"✅ Uploaded local image to S3: {s3_url}")
        return s3_url

    except NoCredentialsError:
        print("❌ AWS credentials not configured properly.")
        return None
    except Exception as e:
        print(f"❌ Error uploading image file: {e}")
        return None