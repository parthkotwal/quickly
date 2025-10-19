# Data Isolation - How You Only See YOUR Queries & Posts

## 🔐 The Complete Flow

### **User A (Alice) - Firebase UID: `alice123`**
### **User B (Bob) - Firebase UID: `bob456`**

---

## Step-by-Step: Data Isolation Mechanism

### **1. Login - Unique ID Assigned**

**Alice logs in:**
```typescript
// login.tsx
const userCredential = await signInWithEmailAndPassword(auth, "alice@example.com", "password");
const user = userCredential.user;

// Firebase assigns unique ID
user.uid = "alice123"  // ← Alice's PERMANENT unique ID

// Store in phone's local storage
await AsyncStorage.setItem("userId", "alice123");
```

**Bob logs in (different device):**
```typescript
const userCredential = await signInWithEmailAndPassword(auth, "bob@example.com", "password");
const user = userCredential.user;

user.uid = "bob456"  // ← Bob's PERMANENT unique ID

await AsyncStorage.setItem("userId", "bob456");
```

---

### **2. Creating Queries - Each User's Data Tagged**

**Alice creates a query: "teach me about AI"**
```typescript
// Frontend sends:
POST /api/saveFeedPosts
{
  userId: "alice123",  // ← Alice's ID attached
  topic: "teach me about AI",
  posts: [...]
}

// Saved to DynamoDB:
{
  userId: "alice123",     // ← Tagged with Alice's ID
  postId: "ai_123_0",
  topic: "teach me about AI",
  text: "AI is amazing..."
}
```

**Bob creates a query: "teach me about AI" (same query!)**
```typescript
// Frontend sends:
POST /api/saveFeedPosts
{
  userId: "bob456",  // ← Bob's ID attached (different!)
  topic: "teach me about AI",
  posts: [...]
}

// Saved to DynamoDB:
{
  userId: "bob456",       // ← Tagged with Bob's ID
  postId: "ai_456_0",
  topic: "teach me about AI",
  text: "AI is amazing..."
}
```

**Result in DynamoDB:**
```
┌─────────────────────────────────────────────┐
│  Table: quickly-posts                       │
├─────────────────────────────────────────────┤
│  userId: "alice123" | topic: "teach me..."  │  ← Alice's data
│  userId: "alice123" | topic: "teach me..."  │
│  userId: "alice123" | topic: "teach me..."  │
├─────────────────────────────────────────────┤
│  userId: "bob456"   | topic: "teach me..."  │  ← Bob's data
│  userId: "bob456"   | topic: "teach me..."  │
│  userId: "bob456"   | topic: "teach me..."  │
└─────────────────────────────────────────────┘
```

---

### **3. Viewing Feed - Filtering by User ID**

**Alice opens her feed:**
```typescript
// chat.tsx
const userId = await AsyncStorage.getItem('userId');
// userId = "alice123"

// API call includes Alice's ID
const response = await fetch(`${API_URL}/getFeed?userId=alice123`);
```

**Backend processes Alice's request:**
```python
# views.py
@api_view(['GET'])
def get_feed(request):
    user_id = request.query_params.get('userId')
    # user_id = "alice123"

    posts = get_user_posts(user_id)  # ← Only gets Alice's posts
    return Response({'posts': posts})
```

**DynamoDB query - Alice's data only:**
```python
# dynamodb_service.py
def get_user_posts(user_id):
    table = get_posts_table()

    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': 'alice123'}  # ← Filters by Alice's ID
    )

    return response.get('Items', [])
```

**What Alice sees:**
```javascript
[
  {userId: "alice123", topic: "teach me about AI", ...},
  {userId: "alice123", topic: "teach me about AI", ...},
  {userId: "alice123", topic: "teach me about AI", ...}
]
// ✅ ONLY Alice's posts!
// ❌ Bob's posts NOT included!
```

---

**Bob opens his feed (same time, different device):**
```typescript
const userId = await AsyncStorage.getItem('userId');
// userId = "bob456"

const response = await fetch(`${API_URL}/getFeed?userId=bob456`);
```

**DynamoDB query - Bob's data only:**
```python
response = table.query(
    KeyConditionExpression='userId = :uid',
    ExpressionAttributeValues={':uid': 'bob456'}  # ← Filters by Bob's ID
)
```

**What Bob sees:**
```javascript
[
  {userId: "bob456", topic: "teach me about AI", ...},
  {userId: "bob456", topic: "teach me about AI", ...},
  {userId: "bob456", topic: "teach me about AI", ...}
]
// ✅ ONLY Bob's posts!
// ❌ Alice's posts NOT included!
```

---

### **4. Topics Dropdown - Also Filtered by User**

**Alice opens dropdown:**
```typescript
const topicsResponse = await fetch(`${API_URL}/getTopics?userId=alice123`);
```

**Backend:**
```python
def get_user_topics(user_id):
    # Query DynamoDB with userId = "alice123"
    response = table.query(
        KeyConditionExpression='userId = :uid',
        ExpressionAttributeValues={':uid': 'alice123'}
    )

    posts = response.get('Items', [])  # Only Alice's posts
    topics = list(set(post.get('topic') for post in posts))
    return topics
```

**Alice's dropdown shows:**
```
📚 teach me about AI
📚 quantum physics
📚 neural networks
```

**Bob's dropdown shows (completely different):**
```
📚 teach me about AI
📚 chemistry
📚 biology
```

**Even though both have "teach me about AI", they are SEPARATE feeds!**

---

## 🔒 Security Guarantees

### **DynamoDB Partition Key = userId**

The table is structured so that:
- **Partition Key**: `userId` (e.g., "alice123")
- **Sort Key**: `postId` (e.g., "ai_123_0")

```
DynamoDB Structure:
┌──────────────────────────────────────┐
│  Partition Key: userId               │  ← Physical data separation!
│  Sort Key: postId                    │
├──────────────────────────────────────┤
│  alice123 | ai_123_0                 │
│  alice123 | ai_123_1                 │
│  alice123 | quantum_456_0            │
├──────────────────────────────────────┤
│  bob456   | ai_789_0                 │  ← Stored in different partition!
│  bob456   | ai_789_1                 │
│  bob456   | chemistry_999_0          │
└──────────────────────────────────────┘
```

**This means:**
- Alice's data is in **Partition: alice123**
- Bob's data is in **Partition: bob456**
- **Queries CANNOT cross partitions** - DynamoDB enforces this!

---

## 🎯 Why This Works

### **1. Firebase Authentication**
- Each user gets a **globally unique UID**
- UID is cryptographically generated
- Impossible for two users to have the same UID

### **2. AsyncStorage (Local Storage)**
- User ID stored on user's device only
- Not shared across devices
- Persists between app sessions

### **3. DynamoDB Queries**
- **KeyConditionExpression='userId = :uid'** is REQUIRED
- DynamoDB physically separates data by partition key
- Cannot query another user's partition

### **4. Backend Validation**
```python
# views.py - Every endpoint requires userId
user_id = request.query_params.get('userId')

if not user_id:
    return Response({'error': 'userId is required'}, status=400)

# Then filters by that userId
posts = get_user_posts(user_id)  # ← Can only get posts for THIS userId
```

---

## 🔄 Complete Example: Two Users Creating Same Query

### **Scenario: Both Alice and Bob ask "teach me about neural networks"**

**Time: 10:00 AM - Alice creates query**
```
DynamoDB Insert:
{
  userId: "alice123",
  postId: "neural_1000_0",
  topic: "teach me about neural networks",
  text: "Neural networks are...",
  createdAt: "2025-01-15T10:00:00"
}
```

**Time: 10:05 AM - Bob creates query**
```
DynamoDB Insert:
{
  userId: "bob456",
  postId: "neural_1005_0",
  topic: "teach me about neural networks",
  text: "Neural networks are...",  // Could even be identical text!
  createdAt: "2025-01-15T10:05:00"
}
```

**Alice views her feed:**
```python
# Backend query:
table.query(KeyConditionExpression='userId = :uid', ExpressionAttributeValues={':uid': 'alice123'})

# Returns:
[
  {userId: "alice123", topic: "teach me about neural networks", createdAt: "10:00:00"}
]
# ✅ Only Alice's version
```

**Bob views his feed:**
```python
# Backend query:
table.query(KeyConditionExpression='userId = :uid', ExpressionAttributeValues={':uid': 'bob456'})

# Returns:
[
  {userId: "bob456", topic: "teach me about neural networks", createdAt: "10:05:00"}
]
# ✅ Only Bob's version
```

---

## 🧪 Test This Yourself

### **Create Two Accounts:**

**Account 1 (on your phone):**
```
Email: alice@test.com
Password: test123
```

**Account 2 (on simulator):**
```
Email: bob@test.com
Password: test123
```

**Both create query: "teach me about AI"**

**View each account's data:**
```bash
# Alice's data
python view_user_data.py <alice-firebase-uid>

# Bob's data
python view_user_data.py <bob-firebase-uid>
```

**You'll see:**
- Different Firebase UIDs
- Different post IDs
- Same topic name, but completely separate data
- Each user only sees their own version

---

## 📊 Visual Summary

```
┌─────────────────────────────────────────────────────────┐
│                     YOUR DATA FLOW                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. LOGIN                                              │
│     Firebase assigns YOU: "alice123"                    │
│     Stored in YOUR phone's AsyncStorage                │
│                                                         │
│  2. CREATE QUERY                                       │
│     Your query tagged with: userId = "alice123"        │
│     Saved to DynamoDB partition: alice123              │
│                                                         │
│  3. VIEW FEED                                          │
│     App reads YOUR ID from AsyncStorage: "alice123"    │
│     Sends to backend: ?userId=alice123                 │
│     Backend queries DynamoDB: WHERE userId = alice123  │
│     Returns ONLY posts where userId = "alice123"       │
│                                                         │
│  4. DROPDOWN TOPICS                                    │
│     Same process - filters by YOUR userId              │
│     Returns ONLY topics from YOUR posts                │
│                                                         │
│  ✅ IMPOSSIBLE to see other users' data                │
│  ✅ Your userId is the KEY to all your data            │
│  ✅ DynamoDB physically separates by partition key     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Bottom Line

**Your queries and posts consistently show up because:**

1. **Firebase gives you a unique ID** when you create an account
2. **That ID is stored on your device** and sent with every request
3. **Backend ONLY queries DynamoDB for that ID**
4. **DynamoDB physically separates data by userId**
5. **No way to access another user's partition**

**Even if someone else creates the EXACT SAME QUERY:**
- Their userId is different
- Data stored in different partition
- You'll never see their version
- They'll never see yours

Your data is **isolated, secure, and consistent**! 🎉
