#!/usr/bin/env python3
"""Simple S3 test without Django"""

import os
import boto3
from dotenv import load_dotenv
from botocore.exceptions import ClientError

# Load environment variables
load_dotenv()

print("=" * 60)
print("🔧 AWS S3 Configuration Test")
print("=" * 60)

# Check environment variables
aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
aws_region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
bucket_name = os.getenv('S3_BUCKET_NAME', 'quickly-images')

print(f"\n📋 Configuration:")
print(f"  AWS Region: {aws_region}")
print(f"  S3 Bucket: {bucket_name}")
print(f"  Access Key: {aws_access_key[:10] + '...' if aws_access_key else 'NOT SET'}")
print(f"  Secret Key: {'SET' if aws_secret_key else 'NOT SET'}")

if not aws_access_key or not aws_secret_key:
    print(f"\n❌ ERROR: AWS credentials not found in environment!")
    print(f"   Check your .env file")
    exit(1)

print(f"\n" + "-" * 60)

# Test S3 connection
print(f"🔌 Testing S3 connection...")

try:
    s3_client = boto3.client(
        's3',
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )

    # Try to list buckets (basic AWS connection test)
    print(f"   Listing buckets...")
    response = s3_client.list_buckets()
    print(f"   ✓ AWS connection successful")
    print(f"   Found {len(response['Buckets'])} bucket(s)")

    # Check if our bucket exists
    bucket_exists = False
    for bucket in response['Buckets']:
        if bucket['Name'] == bucket_name:
            bucket_exists = True
            print(f"   ✓ Bucket '{bucket_name}' exists")
            break

    if not bucket_exists:
        print(f"   ⚠️  Bucket '{bucket_name}' not found")
        print(f"   Creating bucket...")

        try:
            if aws_region == 'us-east-1':
                s3_client.create_bucket(Bucket=bucket_name)
            else:
                s3_client.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={'LocationConstraint': aws_region}
                )
            print(f"   ✓ Bucket created successfully")

            # Set public access
            print(f"   Setting public access...")
            s3_client.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': False,
                    'IgnorePublicAcls': False,
                    'BlockPublicPolicy': False,
                    'RestrictPublicBuckets': False
                }
            )

            # Add bucket policy
            import json
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
            print(f"   ✓ Public access configured")

        except ClientError as e:
            print(f"   ❌ Error creating bucket: {e}")
            exit(1)

    # Test upload
    print(f"\n📤 Testing file upload...")
    test_content = b"Test image content"
    test_filename = "test/test_image.txt"

    s3_client.put_object(
        Bucket=bucket_name,
        Key=test_filename,
        Body=test_content,
        ContentType='text/plain'
    )

    test_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{test_filename}"
    print(f"   ✓ Upload successful!")
    print(f"   🔗 URL: {test_url}")

    # Test delete
    print(f"\n🗑️  Cleaning up test file...")
    s3_client.delete_object(Bucket=bucket_name, Key=test_filename)
    print(f"   ✓ Test file deleted")

    print(f"\n" + "=" * 60)
    print(f"✅ S3 IS WORKING CORRECTLY!")
    print(f"=" * 60)
    print(f"\n✓ You can now upload images to S3")
    print(f"✓ Backend should store images at:")
    print(f"  https://{bucket_name}.s3.{aws_region}.amazonaws.com/posts/...")
    print()

except ClientError as e:
    error_code = e.response['Error']['Code']
    print(f"\n❌ AWS Error: {error_code}")
    print(f"   {e.response['Error']['Message']}")

    if error_code == 'InvalidAccessKeyId':
        print(f"\n💡 Your AWS Access Key ID is invalid")
        print(f"   Check your .env file: AWS_ACCESS_KEY_ID")
    elif error_code == 'SignatureDoesNotMatch':
        print(f"\n💡 Your AWS Secret Access Key is invalid")
        print(f"   Check your .env file: AWS_SECRET_ACCESS_KEY")
    elif error_code == 'AccessDenied':
        print(f"\n💡 Your AWS credentials don't have S3 permissions")
        print(f"   Add S3 permissions to your IAM user")

    exit(1)

except Exception as e:
    print(f"\n❌ Unexpected error: {e}")
    exit(1)
