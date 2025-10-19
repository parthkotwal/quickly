# Feed Management System

## Overview

Users can now store multiple feeds (topics), view them in a dropdown, and delete individual feeds. Each feed contains all the posts generated for a specific topic.

---

## ✨ Features Implemented

### 1. **View All Feeds (Topics)**
- Users see a list of all their past queries/topics in the dropdown
- Topics are sorted by most recent first
- Click on a topic to filter and view only posts from that feed

### 2. **Delete Feeds**
- Each topic in the dropdown has a red trash icon
- Clicking the trash icon deletes all posts for that topic
- Data is removed from DynamoDB
- UI updates automatically

### 3. **Switch Between Feeds**
- "All Topics" shows all posts from all feeds
- Click on a specific topic to filter to just that feed
- Active feed is highlighted in blue

---

## 🗂️ Data Structure

### DynamoDB: `quickly-posts` Table

```javascript
{
  userId: "firebase-uid",           // Partition Key
  postId: "topic_timestamp_0",      // Sort Key
  topic: "neural networks",         // Feed identifier
  text: "...",
  imageUrl: "...",
  likes: 0,
  createdAt: "2025-01-15T10:30:00"
}
```

**Key Points:**
- Each user can have multiple topics
- Each topic can have multiple posts (usually 5)
- Topics are the "feed names"
- Deleting a topic deletes all its posts

---

## 🔄 User Flow

### Creating a New Feed

1. User clicks **"Quickly"** dropdown → **"New Chat"**
2. User types: *"teach me about quantum physics"*
3. Backend generates 5 posts using Bedrock AI
4. Posts are saved to DynamoDB with `topic: "quantum physics"`
5. User returns to home feed
6. Topic appears in dropdown menu

### Viewing a Feed

1. User clicks **"Quickly"** dropdown
2. User sees:
   ```
   + New Chat
   📱 All Topics (active)
   📚 quantum physics
   📚 neural networks
   📚 machine learning
   ```
3. User clicks **"quantum physics"**
4. Feed filters to show only quantum physics posts

### Deleting a Feed

1. User opens dropdown
2. User sees trash icon 🗑️ next to each topic
3. User clicks trash icon next to **"neural networks"**
4. All neural networks posts are deleted from DynamoDB
5. If user was viewing "neural networks", view switches to "All Topics"
6. Dropdown updates to remove deleted topic

---

## 🔌 API Endpoints

### Get All Topics for User
```bash
GET /api/getTopics?userId=<firebase-uid>

Response:
{
  "topics": ["quantum physics", "neural networks", "machine learning"]
}
```

### Get All Posts (All Topics)
```bash
GET /api/getFeed?userId=<firebase-uid>

Response:
{
  "posts": [
    { postId: "quantum_123_0", topic: "quantum physics", text: "..." },
    { postId: "quantum_123_1", topic: "quantum physics", text: "..." },
    { postId: "neural_456_0", topic: "neural networks", text: "..." },
    ...
  ]
}
```

### Get Posts for Specific Topic (Single Feed)
```bash
GET /api/getFeedByTopic?userId=<firebase-uid>&topic=quantum physics

Response:
{
  "topic": "quantum physics",
  "posts": [
    { postId: "quantum_123_0", topic: "quantum physics", text: "..." },
    { postId: "quantum_123_1", topic: "quantum physics", text: "..." },
    ...
  ]
}
```

### Delete a Feed (Topic)
```bash
DELETE /api/deleteFeed?userId=<firebase-uid>&topic=quantum physics

Response:
{
  "message": "Feed 'quantum physics' deleted successfully",
  "deleted_count": 5
}
```

---

## 💻 Frontend Implementation

### Dropdown UI Structure

```tsx
{/* Dropdown Menu */}
{dropdownVisible && (
  <View style={styles.dropdown}>
    {/* New Chat Button */}
    <TouchableOpacity onPress={() => router.push('/chatbot')}>
      <Ionicons name="add-circle-outline" />
      <Text>New Chat</Text>
    </TouchableOpacity>

    {/* All Topics */}
    <TouchableOpacity onPress={() => loadFeedData()}>
      <Ionicons name="apps-outline" />
      <Text>All Topics</Text>
    </TouchableOpacity>

    {/* Each Topic with Delete Button */}
    {topics.map((topic) => (
      <View style={styles.dropdownItemRow}>
        <TouchableOpacity onPress={() => loadFeedData(topic)}>
          <Ionicons name="book-outline" />
          <Text>{topic}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteFeed(topic)}>
          <Ionicons name="trash-outline" color="#ef4444" />
        </TouchableOpacity>
      </View>
    ))}
  </View>
)}
```

### Key Functions

**Load Feed Data (with optional filter):**
```typescript
const loadFeedData = async (filterTopic?: string) => {
  const userId = await AsyncStorage.getItem('userId');

  // Get all topics
  const topicsResponse = await fetch(`${API_URL}/getTopics?userId=${userId}`);
  setTopics(topicsData.topics);

  // Get posts (all or filtered)
  let posts = await fetch(`${API_URL}/getFeed?userId=${userId}`);

  // Filter by topic if specified
  if (filterTopic) {
    posts = posts.filter(p => p.topic === filterTopic);
    setCurrentTopic(filterTopic);
  } else {
    setCurrentTopic(null); // "All Topics"
  }

  setFeedPosts(posts);
};
```

**Delete Feed:**
```typescript
const deleteFeed = async (topic: string) => {
  const userId = await AsyncStorage.getItem('userId');

  await fetch(
    `${API_URL}/deleteFeed?userId=${userId}&topic=${encodeURIComponent(topic)}`,
    { method: 'DELETE' }
  );

  // If viewing deleted topic, switch to all topics
  if (currentTopic === topic) {
    setCurrentTopic(null);
  }

  // Reload data
  loadFeedData(currentTopic === topic ? undefined : currentTopic);
};
```

---

## 🎨 UI Design

### Dropdown Menu

```
┌─────────────────────────────┐
│  + New Chat                 │
├─────────────────────────────┤
│  📱 All Topics (active)     │
├─────────────────────────────┤
│  📚 quantum physics      🗑️ │
├─────────────────────────────┤
│  📚 neural networks      🗑️ │
├─────────────────────────────┤
│  📚 machine learning     🗑️ │
└─────────────────────────────┘
```

**Visual States:**
- **Active topic**: Blue background (#eef2ff)
- **Delete icon**: Red (#ef4444)
- **Hover/Press**: Slight opacity change

---

## 🧪 Testing the Feature

### Test Scenario 1: Create Multiple Feeds
1. Start app and login
2. Create feed for "quantum physics"
3. Create feed for "neural networks"
4. Open dropdown → See both topics listed

### Test Scenario 2: Switch Between Feeds
1. Open dropdown → Click "quantum physics"
2. Feed shows only quantum physics posts
3. Open dropdown → Click "All Topics"
4. Feed shows all posts

### Test Scenario 3: Delete a Feed
1. Open dropdown
2. Click trash icon next to "neural networks"
3. Topic removed from dropdown
4. Posts for "neural networks" no longer appear in feed
5. Verify in DynamoDB that posts are deleted

### Test Scenario 4: Delete Currently Active Feed
1. Click on "quantum physics" topic
2. Open dropdown → Click trash icon next to "quantum physics"
3. View automatically switches to "All Topics"
4. "quantum physics" removed from dropdown

---

## 📊 Backend Implementation

### DynamoDB Service

**Get Posts by Topic:**
```python
def get_posts_by_topic(user_id, topic):
    """Get all posts for a specific topic"""
    table = get_posts_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        FilterExpression='topic = :topic',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':topic': topic
        }
    )

    return response.get('Items', [])
```

**Delete Feed:**
```python
def delete_feed(user_id, topic):
    """Delete all posts for a specific topic/feed"""
    table = get_posts_table()

    # Get all posts for this topic
    posts = get_posts_by_topic(user_id, topic)

    # Delete each post
    deleted_count = 0
    for post in posts:
        table.delete_item(
            Key={
                'userId': user_id,
                'postId': post['postId']
            }
        )
        deleted_count += 1

    return {'deleted_count': deleted_count, 'topic': topic}
```

---

## 🔍 Troubleshooting

### Topics not showing in dropdown
- Check that posts have a `topic` field
- Verify `getTopics` API is returning data
- Check console logs for errors

### Delete not working
- Check AWS credentials have DynamoDB delete permissions
- Verify `userId` and `topic` are being sent correctly
- Check backend logs for errors

### Feed not filtering correctly
- Ensure topic names match exactly (case-sensitive)
- Check `loadFeedData(topic)` is being called correctly
- Verify filter logic in frontend

---

## 🚀 Future Enhancements

- [ ] Rename feeds
- [ ] Share feeds with other users
- [ ] Export feed as PDF
- [ ] Add feed descriptions/notes
- [ ] Sort feeds (alphabetical, by date, by # of posts)
- [ ] Confirm dialog before deleting
- [ ] Undo delete feature
- [ ] Archive feeds instead of delete

---

## 📝 Summary

✅ **Users can now:**
1. View all their past queries/topics in a dropdown
2. Click on a topic to filter posts from that specific feed
3. Delete individual feeds using the trash icon
4. See all posts from all feeds with "All Topics"

✅ **Backend provides:**
- `/api/getTopics` - List all topics for user
- `/api/getFeedByTopic` - Get posts for specific topic
- `/api/deleteFeed` - Delete all posts for a topic

✅ **Data is:**
- Stored in DynamoDB `quickly-posts` table
- Organized by `userId` and `topic`
- Efficiently queried and filtered

The feed management system is now fully functional! 🎉
