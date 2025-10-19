#!/usr/bin/env python3
"""Setup S3 bucket with proper public access policy"""

import os
import boto3
import json
from dotenv import load_dotenv
from botocore.exceptions import ClientError

load_dotenv()

aws_region = os.getenv('AWS_DEFAULT_REGION', 'us-west-2')
bucket_name = os.getenv('S3_BUCKET_NAME', 'quickly-images')

s3_client = boto3.client(
    's3',
    region_name=aws_region,
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
)

print(f"🔧 Setting up S3 bucket: {bucket_name}")
print(f"   Region: {aws_region}\n")

try:
    # Check bucket exists
    s3_client.head_bucket(Bucket=bucket_name)
    print(f"✓ Bucket exists")

    # Set bucket policy for public read
    print(f"📝 Setting public read policy...")

    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": f"arn:aws:s3:::{bucket_name}/*"
        }]
    }

    s3_client.put_bucket_policy(
        Bucket=bucket_name,
        Policy=json.dumps(bucket_policy)
    )

    print(f"✓ Bucket policy set - all objects are publicly readable\n")
    print(f"✅ S3 bucket '{bucket_name}' is ready!")
    print(f"   Images will be accessible at:")
    print(f"   https://{bucket_name}.s3.{aws_region}.amazonaws.com/posts/...\n")

except ClientError as e:
    print(f"❌ Error: {e}")
    exit(1)
