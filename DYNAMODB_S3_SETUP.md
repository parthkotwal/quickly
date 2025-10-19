# DynamoDB & S3 Setup Guide

Your app now uses **AWS DynamoDB** for data storage and **Google Image Search** (which could be replaced with S3 if you want to store images).

## What Changed

### ✅ Removed:
- SQLite database
- AsyncStorage for posts (still used for auth tokens)

### ✅ Added:
- **DynamoDB** for storing:
  - Posts
  - Likes
  - User data
- **Likes functionality**:
  - Users can like/unlike posts
  - Liked posts are saved to DynamoDB
  - View all liked posts in dedicated screen

## New API Endpoints

### 1. Save Posts
**POST** `/api/saveFeedPosts`
```json
{
  "userId": "user123",
  "topic": "Machine Learning",
  "posts": [...]
}
```

### 2. Get User Feed
**GET** `/api/getFeed?userId=user123`

### 3. Toggle Like
**POST** `/api/toggleLike`
```json
{
  "userId": "user123",
  "postId": "post456",
  "postData": {...},
  "action": "like" // or "unlike"
}
```

### 4. Get Liked Posts
**GET** `/api/getLikedPosts?userId=user123`

## What You Need to Do

### 1. Ensure AWS Credentials Are Set
Your AWS credentials in `.env` need permissions for:
- **DynamoDB** (create tables, read, write)
- **Bedrock** (for AI generation)

Check your IAM user has these policies:
- `AmazonDynamoDBFullAccess`
- `AmazonBedrockFullAccess`

### 2. DynamoDB Tables Will Auto-Create

The first time you run the app, it will automatically create these tables:
- `quickly-posts` (stores all generated posts)
- `quickly-likes` (stores user likes)
- `quickly-users` (for future user data)

**You don't need to create them manually!**

### 3. Restart Django Server

```bash
cd /Users/dhruvreddy/quickly/quickly/backend
python manage.py runserver 0.0.0.0:8000
```

### 4. Test the App

1. **Generate a feed** - Posts are now saved to DynamoDB
2. **Like a post** - Click the heart icon
3. **View liked posts** - Click the heart icon in the header
4. **Unlike a post** - Click the red heart to remove

## Features

### Likes Functionality
- **Like a post**: Tap the heart icon → Saves to DynamoDB
- **Unlike a post**: Tap the red heart → Removes from DynamoDB
- **View liked posts**: Tap heart icon in header → See all your liked posts
- **Persistent**: Likes are saved permanently in DynamoDB

### Data Storage
- All posts saved in DynamoDB (not AsyncStorage)
- Likes tracked per user
- Can query posts by user, topic, or get all liked posts

## Optional: Add S3 for Image Storage

Currently, images come from Google Image Search. If you want to store images in S3:

### Add to `.env`:
```
S3_BUCKET_NAME=quickly-images
S3_REGION=us-east-1
```

### Update IAM permissions:
Add `AmazonS3FullAccess` policy

### Code changes needed:
1. Download images from Google
2. Upload to S3
3. Store S3 URL in DynamoDB

(Let me know if you want me to implement this!)

## Monitoring

### Check DynamoDB Tables:
1. Go to [AWS Console](https://console.aws.amazon.com/dynamodb/)
2. Select your region (us-west-2)
3. Click "Tables" → You should see:
   - `quickly-posts`
   - `quickly-likes`
   - `quickly-users`

### View Data:
- Click on a table
- Go to "Explore table items"
- See your stored posts and likes

## Cost

**DynamoDB Free Tier:**
- 25 GB of storage
- 25 read/write capacity units (enough for ~200M requests/month)
- Your app is well within free tier limits!

## Troubleshooting

### Error: "Unable to locate credentials"
- Check AWS credentials in `.env`
- Make sure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set

### Error: "Table does not exist"
- Tables auto-create on first use
- Wait a few seconds for table creation
- Check AWS Console to verify

### Posts not saving
- Check Django server logs
- Ensure userId is being sent from frontend
- Verify AWS credentials have DynamoDB permissions

## Next Steps

Your app now has:
- ✅ Persistent storage (DynamoDB)
- ✅ Likes functionality
- ✅ Liked posts screen
- ✅ Scalable architecture

Want to add:
- S3 image storage?
- Comments functionality?
- Sharing posts?

Let me know!
