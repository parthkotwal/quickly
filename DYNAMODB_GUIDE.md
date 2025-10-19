# DynamoDB Data Structure & Query Guide

## 📊 Database Collections (Tables)

### 1. **quickly-posts** - Educational Posts
Stores all AI-generated educational posts for each user.

**Schema:**
```javascript
{
  userId: "firebase-uid",              // Partition Key
  postId: "topic_timestamp_0",         // Sort Key
  topic: "neural networks",
  text: "Neural networks mimic the human brain...",
  imageUrl: "https://s3.amazonaws.com/...",
  imageQuery: "neural network",
  musicUrl: "https://example.com/music/default.mp3",
  musicTitle: "Background Music",
  likes: 0,
  comments: 0,
  shares: 0,
  createdAt: "2025-01-15T10:30:00.000Z"
}
```

### 2. **quickly-likes** - Liked Posts
Stores posts that users have liked.

**Schema:**
```javascript
{
  userId: "firebase-uid",              // Partition Key
  postId: "topic_timestamp_0",         // Sort Key
  post: { /* entire post object */ },
  likedAt: "2025-01-15T10:30:00.000Z"
}
```

### 3. **quickly-users** - User Profiles
*Currently defined but not actively used*

---

## 🔄 Data Flow: How Data is Saved

### **Step 1: User Generates Content**
1. User types a topic in the chatbot (e.g., "teach me about neural networks")
2. Frontend sends to: `POST /api/generateFeed`

### **Step 2: Backend Generates Posts**
1. Backend calls Amazon Bedrock (Claude/Llama) to generate 5 educational posts
2. Fetches images from Google/Bing Image Search
3. Uploads images to S3
4. Returns posts to frontend

### **Step 3: Frontend Saves Posts**
1. Frontend sends posts to: `POST /api/saveFeedPosts`
   ```json
   {
     "userId": "firebase-uid-here",
     "topic": "neural networks",
     "posts": [ /* 5 posts */ ]
   }
   ```

2. Backend saves to DynamoDB `quickly-posts` table

### **Step 4: View Posts**
1. Frontend fetches: `GET /api/getFeed?userId=firebase-uid`
2. Backend queries DynamoDB and returns all posts for that user

---

## 🔍 How to View User Data

### **Method 1: Python Script (Easiest)**

```bash
cd /Users/dhruvreddy/quickly/quickly/backend

# Activate virtual environment
source venv/bin/activate

# View data for a specific user
python view_user_data.py <firebase-user-id>

# Example:
# python view_user_data.py abc123xyz456
```

**Output:**
```
🔍 Fetching data for user: abc123xyz456

============================================================
📝 POSTS:
============================================================

[Post 1]
  Topic: neural networks
  Post ID: neural networks_1737000000_0
  Text: Neural networks mimic the human brain! They learn patterns from data...
  Image URL: https://s3.amazonaws.com/quickly-images/neural-network...
  Created: 2025-01-15T10:30:00
  Likes: 0

  Total posts: 5

============================================================
📚 TOPICS:
============================================================
  1. neural networks
  2. quantum physics

  Total topics: 2

============================================================
❤️  LIKED POSTS:
============================================================

  Total liked posts: 0
```

---

### **Method 2: AWS CLI**

```bash
# List all posts for a user
aws dynamodb query \
    --table-name quickly-posts \
    --key-condition-expression "userId = :uid" \
    --expression-attribute-values '{":uid":{"S":"your-firebase-uid"}}'

# List all liked posts for a user
aws dynamodb query \
    --table-name quickly-likes \
    --key-condition-expression "userId = :uid" \
    --expression-attribute-values '{":uid":{"S":"your-firebase-uid"}}'

# Scan all items in a table (use sparingly - expensive!)
aws dynamodb scan --table-name quickly-posts --limit 10
```

---

### **Method 3: AWS Console (Web UI)**

1. Go to [AWS Console](https://console.aws.amazon.com/dynamodb)
2. Navigate to **DynamoDB** → **Tables**
3. Select `quickly-posts` or `quickly-likes`
4. Click **Explore table items**
5. Use filters to search by `userId`

---

### **Method 4: API Endpoints (Test with curl)**

```bash
# Get all posts for a user
curl "http://localhost:8000/api/getFeed?userId=your-firebase-uid"

# Get topics for a user
curl "http://localhost:8000/api/getTopics?userId=your-firebase-uid"

# Get liked posts for a user
curl "http://localhost:8000/api/getLikedPosts?userId=your-firebase-uid"

# Like a post
curl -X POST http://localhost:8000/api/toggleLike \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-firebase-uid",
    "postId": "topic_timestamp_0",
    "postData": { /* post object */ },
    "action": "like"
  }'
```

---

## 📡 Available API Endpoints

| Endpoint | Method | Purpose | Parameters |
|----------|--------|---------|------------|
| `/api/generateFeed` | POST | Generate 5 AI posts | `{ topic }` |
| `/api/saveFeedPosts` | POST | Save posts to DynamoDB | `{ userId, topic, posts }` |
| `/api/getFeed` | GET | Get all user posts | `?userId=...` |
| `/api/getTopics` | GET | Get unique topics | `?userId=...` |
| `/api/getLikedPosts` | GET | Get liked posts | `?userId=...` |
| `/api/toggleLike` | POST | Like/unlike post | `{ userId, postId, action }` |
| `/api/health` | GET | Health check | None |

---

## 🔐 Getting Firebase User IDs

When a user logs in with Firebase, the `userId` is stored in AsyncStorage:

```typescript
// From login.tsx
const userCredential = await signInWithEmailAndPassword(auth, email, password);
const user = userCredential.user;

// user.uid is the Firebase UID
await AsyncStorage.setItem("userId", user.uid);
```

You can view the Firebase UID in:
1. **Firebase Console** → Authentication → Users
2. **React Native Debugger** → AsyncStorage
3. **Console logs** when user logs in

---

## 🧪 Example: Complete Data Flow

**User: John (Firebase UID: `abc123xyz`)**

1. **John logs in:**
   - Firebase authenticates
   - UID `abc123xyz` stored in AsyncStorage

2. **John types: "teach me about AI"**
   - POST `/api/generateFeed` → Bedrock generates 5 posts
   - POST `/api/saveFeedPosts` → Saves to DynamoDB

3. **DynamoDB `quickly-posts` now has:**
   ```
   userId: abc123xyz, postId: ai_1737000000_0
   userId: abc123xyz, postId: ai_1737000000_1
   userId: abc123xyz, postId: ai_1737000000_2
   userId: abc123xyz, postId: ai_1737000000_3
   userId: abc123xyz, postId: ai_1737000000_4
   ```

4. **John views feed:**
   - GET `/api/getFeed?userId=abc123xyz`
   - Returns all 5 posts

5. **John likes post #2:**
   - POST `/api/toggleLike` → Saves to `quickly-likes` table

---

## 🛠️ Quick Troubleshooting

**No data showing for user?**
```bash
# Check if tables exist
aws dynamodb list-tables

# Check if AWS credentials are configured
aws sts get-caller-identity

# Verify data was saved
python view_user_data.py <your-firebase-uid>
```

**Tables don't exist?**
- Tables are auto-created on first write
- Run the app and generate a post to create tables

**Can't query data?**
- Make sure AWS credentials are configured
- Check `~/.aws/credentials` has valid keys
- Verify IAM permissions for DynamoDB

---

## 📝 Notes

- **Partition Key**: `userId` - Data is grouped by user
- **Sort Key**: `postId` - Posts are sorted by ID (timestamp-based)
- **Auto-creation**: Tables are created automatically if they don't exist
- **Region**: Default is `us-east-1` (configurable in `.env`)

---

For more details, see the source code:
- [dynamodb_service.py](backend/api/dynamodb_service.py) - DynamoDB operations
- [views.py](backend/api/views.py) - API endpoints
- [s3_service.py](backend/api/s3_service.py) - S3 image storage
