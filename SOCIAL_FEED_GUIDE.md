# Social Feed System - Complete Guide

## 🎉 What's New

Your app now has a **social/public feed system** like TikTok or Instagram!

### **Before (Private):**
- Login → See ONLY your own posts
- No one else's content visible
- Isolated personal learning

### **After (Social/Public):**
- Login → See **EVERYONE's posts** in a mixed feed
- Your feeds show up for others
- Collaborative learning community
- Can still filter to YOUR feeds via dropdown

---

## 🌟 Features Implemented

### 1. **Public Feed (Default View)**
When you login, you see a random mix of posts from ALL users:
```
Feed shows:
- Alice's "quantum physics" post #2
- Bob's "neural networks" post #1
- Charlie's "chemistry" post #3
- Alice's "AI basics" post #1
...
```

### 2. **Username Display**
Every post shows who created it:
```
u/alice123  Neural networks mimic the human brain...
u/bob456    Quantum entanglement is fascinating...
```

### 3. **Privacy Control**
- **Default**: All feeds are PUBLIC (everyone sees them)
- **Future**: Can mark feeds as private (only you see them)

### 4. **Smart Algorithm**
Posts are sorted with a basic algorithm:
- Most recent posts prioritized
- Random shuffling for variety
- Weighted towards newer content

### 5. **Dropdown Still Shows YOUR Topics**
- **"Public Feed"** - Everyone's content (default)
- **Your topics** - Filter to just your feeds
- Delete icon - Remove your feeds

---

## 📊 New Data Structure

### DynamoDB `quickly-posts` Table:

```javascript
{
  userId: "alice123",
  postId: "ai_1737123456_0",
  topic: "teach me about AI",
  username: "alice",              // ← NEW: Shows on posts
  isPrivate: false,               // ← NEW: false = public, true = private
  text: "AI is amazing...",
  imageUrl: "...",
  likes: 0,
  createdAt: "2025-01-15T10:30:00"
}
```

---

## 🔄 How It Works

### **Creating a Feed:**

1. **User creates feed:**
   ```
   User: Alice
   Topic: "teach me about AI"
   ```

2. **Backend generates 5 posts**

3. **Posts saved with:**
   ```javascript
   {
     userId: "alice123",
     username: "alice",
     isPrivate: false,  // PUBLIC by default
     topic: "teach me about AI",
     ...
   }
   ```

4. **Posts appear in:**
   - ✅ Alice's feed (her topics)
   - ✅ Bob's feed (public feed)
   - ✅ Charlie's feed (public feed)
   - ✅ Everyone's public feed!

---

### **Viewing Feeds:**

**Default View - Public Feed:**
```typescript
// On login/app open
GET /api/getPublicFeed?limit=50

// Returns:
{
  posts: [
    {userId: "alice123", username: "alice", topic: "AI", ...},
    {userId: "bob456", username: "bob", topic: "quantum", ...},
    {userId: "charlie789", username: "charlie", topic: "chem", ...},
    // Random mix from all users
  ]
}
```

**Filtered View - Your Topics:**
```typescript
// User clicks topic in dropdown
GET /api/getFeedByTopic?userId=alice123&topic=AI

// Returns:
{
  posts: [
    {userId: "alice123", topic: "AI", ...},
    {userId: "alice123", topic: "AI", ...},
    // Only Alice's AI posts
  ]
}
```

---

## 🎨 UI Changes

### **Dropdown Menu:**

```
┌──────────────────────────────────┐
│  + New Chat                      │
├──────────────────────────────────┤
│  🌍 Public Feed  (active - blue)  │  ← NEW: Shows everyone's content
├──────────────────────────────────┤
│  📚 my topic 1               🗑️  │  ← Your feeds (filterable)
├──────────────────────────────────┤
│  📚 my topic 2               🗑️  │
└──────────────────────────────────┘
```

### **Post Display:**

```
┌──────────────────────────────────┐
│  [Image]                         │
│                                  │
│  ❤️ 💬 ✈️                        │
│                                  │
│  Liked by Sarah and 1.2K others  │
│                                  │
│  u/alice  Neural networks are... │  ← NEW: Username shown
│                                  │
│  View all 45 comments            │
└──────────────────────────────────┘
```

---

## 🔌 New API Endpoints

### 1. **Get Public Feed**
```bash
GET /api/getPublicFeed?limit=50

Response:
{
  "posts": [
    {
      "userId": "alice123",
      "username": "alice",
      "topic": "AI basics",
      "text": "...",
      "isPrivate": false,
      ...
    },
    {
      "userId": "bob456",
      "username": "bob",
      "topic": "quantum physics",
      "text": "...",
      "isPrivate": false,
      ...
    }
  ],
  "count": 50
}
```

### 2. **Save Feed with Privacy**
```bash
POST /api/saveFeedPosts
{
  "userId": "alice123",
  "topic": "AI basics",
  "posts": [...],
  "username": "alice",        // ← NEW
  "isPrivate": false          // ← NEW: false = public
}
```

### 3. **Update Feed Privacy**
```bash
POST /api/updateFeedPrivacy
{
  "userId": "alice123",
  "topic": "AI basics",
  "isPrivate": true  // Make private (hide from public feed)
}

Response:
{
  "message": "Feed 'AI basics' privacy updated",
  "updated_count": 5,
  "isPrivate": true
}
```

---

## 🔐 Privacy System

### **Public Posts (isPrivate: false)**
- ✅ Appear in public feed
- ✅ Visible to ALL users
- ✅ Show username
- ✅ Default setting

### **Private Posts (isPrivate: true)**
- ❌ Do NOT appear in public feed
- ✅ Only visible to post creator
- ✅ Dropdown still shows topic
- ✅ Can make public later

---

## 📈 Feed Algorithm

**Basic Smart Sorting:**

1. **Fetch all public posts** (isPrivate = false)
2. **Sort by most recent** (createdAt descending)
3. **Take recent 100 posts**
4. **Apply weighted random shuffle:**
   - Newer posts get higher weight
   - Shuffled for variety
5. **Return top 50** unique posts

**Result:** Feed that's mostly recent but with variety!

---

## 🧪 Testing the Social Feed

### **Test Scenario 1: Create Public Feed**

1. **Login as Alice**
2. **Create feed:** "teach me about AI"
3. **Check:**
   ```bash
   # Alice sees it in "Public Feed"
   # Alice sees it in her topics dropdown
   ```

4. **Login as Bob (different account)**
5. **Check:**
   ```bash
   # Bob sees Alice's AI posts in "Public Feed"
   # Bob does NOT see it in his topics dropdown (not his feed)
   ```

---

### **Test Scenario 2: Filter vs Public**

1. **Alice creates 3 feeds:**
   - "AI basics"
   - "quantum physics"
   - "neural networks"

2. **Click "Public Feed" dropdown:**
   - See mixed feed from everyone

3. **Click "AI basics" in dropdown:**
   - See ONLY Alice's AI basics posts

4. **Click "Public Feed" again:**
   - Back to everyone's content

---

### **Test Scenario 3: Username Display**

1. **Create feed as Alice**
2. **View in feed:**
   ```
   u/alice  AI is transforming the world...
   ```

3. **Bob creates feed**
4. **Alice's feed shows:**
   ```
   u/alice  AI is transforming...
   u/bob    Quantum mechanics explains...
   u/alice  Neural networks mimic...
   ```

---

## 🎯 User Flow Examples

### **Example 1: New User Experience**

```
1. Alice signs up
   ↓
2. Opens app → Sees "No feed yet"
   ↓
3. Creates feed: "teach me about Python"
   ↓
4. Feed saved as PUBLIC (isPrivate: false)
   ↓
5. Alice sees her 5 posts in public feed
   ↓
6. Bob signs up
   ↓
7. Opens app → Sees Alice's Python posts!
   ↓
8. Bob creates feed: "teach me about JavaScript"
   ↓
9. Now Alice sees Python + JavaScript mix
```

---

### **Example 2: Privacy Control (Future)**

```
1. Alice creates "personal notes" feed
   ↓
2. Long-press feed → "Make Private"
   ↓
3. POST /api/updateFeedPrivacy (isPrivate: true)
   ↓
4. "personal notes" removed from public feed
   ↓
5. Only Alice can see it (in her dropdown)
   ↓
6. Bob's feed no longer shows it
```

---

## 🔧 Configuration

### **Change Feed Algorithm:**

Edit `backend/api/dynamodb_service.py`:

```python
def get_public_feed(limit=50):
    # Current: Weighted random with recent bias

    # Option 1: Purely random
    random.shuffle(posts)
    return posts[:limit]

    # Option 2: Strictly chronological
    return sorted(posts, key=lambda p: p['createdAt'], reverse=True)[:limit]

    # Option 3: By popularity (most likes)
    return sorted(posts, key=lambda p: p.get('likes', 0), reverse=True)[:limit]
```

### **Change Default Privacy:**

Edit `frontend/app/chatbot.tsx`:

```typescript
body: JSON.stringify({
  userId,
  topic,
  posts: data.posts,
  username,
  isPrivate: true,  // ← Change to true for private by default
}),
```

---

## 📁 Files Changed

### Backend:
1. **[dynamodb_service.py](backend/api/dynamodb_service.py)**
   - Added `username` and `isPrivate` to `save_posts()`
   - Added `get_public_feed()` function
   - Added `update_feed_privacy()` function

2. **[views.py](backend/api/views.py)**
   - Updated `save_feed_posts` to accept username/privacy
   - Added `get_public_feed_view()` endpoint
   - Added `update_feed_privacy_view()` endpoint

3. **[urls.py](backend/api/urls.py)**
   - Added `/api/getPublicFeed`
   - Added `/api/updateFeedPrivacy`

### Frontend:
4. **[chat.tsx](frontend/app/chat.tsx)**
   - Changed `loadFeedData()` to load public feed by default
   - Updated dropdown from "All Topics" to "Public Feed"
   - Added username display `u/username`
   - Added `usernameText` style

5. **[chatbot.tsx](frontend/app/chatbot.tsx)**
   - Updated `saveFeedPosts` to include username
   - Set `isPrivate: false` by default

---

## 🚀 What's Next

### Future Enhancements:

1. **Privacy Toggle UI**
   - Add switch when creating feed
   - Toggle in settings for existing feeds

2. **User Profiles**
   - Click on `u/username` to see their profile
   - View all their public feeds

3. **Follow System**
   - Follow specific users
   - See feed from people you follow

4. **Advanced Algorithm**
   - Machine learning recommendations
   - Based on topics you like
   - Personalized "For You" page

5. **Search**
   - Search public feeds by topic
   - Find specific content

6. **Reactions & Comments**
   - Comment on any post
   - React with emojis

---

## ✅ Summary

### **What Changed:**

| Feature | Before | After |
|---------|--------|-------|
| Feed Content | Only your posts | Everyone's posts (public) |
| Username | Hidden | Shown as `u/username` |
| Privacy | All private | Public by default, can make private |
| Dropdown | "All Topics" | "Public Feed" (everyone) |
| Algorithm | None | Smart sorting (recent + random) |

### **Impact:**

- 🌍 **Community**: Users see each other's content
- 📈 **Engagement**: Always new content to see
- 🎓 **Learning**: Learn from others' feeds
- 🔒 **Control**: Can still make feeds private
- 👤 **Identity**: Username shows who created what

---

## 🧪 Quick Test Commands

```bash
# View all public posts
curl "http://localhost:8000/api/getPublicFeed?limit=10"

# Create public feed
curl -X POST http://localhost:8000/api/saveFeedPosts \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice123",
    "topic": "AI basics",
    "posts": [...],
    "username": "alice",
    "isPrivate": false
  }'

# Make feed private
curl -X POST http://localhost:8000/api/updateFeedPrivacy \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "alice123",
    "topic": "AI basics",
    "isPrivate": true
  }'
```

---

Your app is now a **social learning platform**! 🎉

Users contribute to a shared knowledge base while still maintaining control over their own content.
