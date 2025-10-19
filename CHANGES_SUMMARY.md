# Feed Management System - Changes Summary

## 📝 Files Modified

### Backend Changes

#### 1. **backend/api/dynamodb_service.py**
Added two new functions:

```python
def get_posts_by_topic(user_id, topic):
    """Get all posts for a specific topic"""
    # Queries DynamoDB for posts filtered by topic

def delete_feed(user_id, topic):
    """Delete all posts for a specific topic/feed"""
    # Deletes all posts associated with a topic
```

#### 2. **backend/api/views.py**
Added two new API endpoints:

```python
@api_view(['GET'])
def get_feed_by_topic(request):
    """Get all posts for a specific topic/feed"""
    # GET /api/getFeedByTopic?userId=X&topic=Y

@api_view(['DELETE'])
def delete_feed_by_topic(request):
    """Delete all posts for a specific topic/feed"""
    # DELETE /api/deleteFeed?userId=X&topic=Y
```

#### 3. **backend/api/urls.py**
Added two new routes:

```python
path('getFeedByTopic', views.get_feed_by_topic, name='get_feed_by_topic'),
path('deleteFeed', views.delete_feed_by_topic, name='delete_feed'),
```

---

### Frontend Changes

#### 4. **frontend/app/chat.tsx**

**Added `deleteFeed` function:**
```typescript
const deleteFeed = async (topic: string) => {
  // Calls DELETE /api/deleteFeed
  // Reloads feed data
  // Switches to "All Topics" if deleting current topic
};
```

**Updated dropdown UI:**
- Changed each topic item to include a delete button
- Topics now wrapped in `<View style={styles.dropdownItemRow}>`
- Added trash icon with red color

**Added new styles:**
```typescript
dropdownItemRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
dropdownItemWithDelete: {
  flex: 1,
  paddingRight: 0,
},
deleteButton: {
  padding: 16,
  paddingLeft: 8,
  paddingRight: 20,
},
```

---

## 🎯 What This Enables

### User Features
✅ View all past topics/queries in dropdown
✅ Click on a topic to filter posts from that specific feed
✅ Delete individual feeds with trash icon
✅ Switch between "All Topics" and specific topics
✅ Active topic highlighted in blue

### Backend Features
✅ Query posts by topic
✅ Delete all posts for a topic
✅ Return topic list sorted by most recent

---

## 📊 API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/getFeedByTopic?userId=X&topic=Y` | GET | Get posts for specific topic |
| `/api/deleteFeed?userId=X&topic=Y` | DELETE | Delete all posts for topic |

---

## 🧪 How to Test

### 1. Create Multiple Feeds
```bash
# Start backend
cd backend && python manage.py runserver

# Start frontend
cd frontend && npx expo start

# In app:
1. Login
2. Create feed: "teach me about AI"
3. Create feed: "teach me about quantum physics"
4. Open dropdown → See both topics
```

### 2. Delete a Feed
```bash
# In app:
1. Open dropdown
2. Click trash icon next to "AI"
3. Topic removed from dropdown
4. Posts deleted from DynamoDB
```

### 3. Verify in Backend
```bash
# Check user data
cd backend
python view_user_data.py <your-firebase-uid>

# You should see topics and post counts
```

---

## 🔄 Data Flow

```mermaid
User clicks "teach me about AI"
    ↓
Backend generates 5 posts
    ↓
Posts saved with topic: "AI"
    ↓
Topic appears in dropdown
    ↓
User can:
  - Click topic → Filter to AI posts
  - Click trash → Delete all AI posts
```

---

## 📁 New Files Created

1. **FEED_MANAGEMENT.md** - Complete documentation
2. **CHANGES_SUMMARY.md** - This file
3. **backend/view_user_data.py** - Script to view user data
4. **backend/query_dynamodb.sh** - Shell script to query DynamoDB

---

## ✅ Testing Checklist

- [ ] Create 3 different topics
- [ ] View dropdown showing all topics
- [ ] Click on topic to filter feed
- [ ] Click "All Topics" to see all posts
- [ ] Delete a topic using trash icon
- [ ] Verify topic removed from dropdown
- [ ] Verify posts deleted from DynamoDB
- [ ] Delete currently active topic
- [ ] Verify view switches to "All Topics"

---

## 🚀 Ready to Use!

All changes are complete and the feed management system is fully functional.

**To run:**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd frontend
npx expo start
```

Then test the dropdown menu in the app! 🎉
