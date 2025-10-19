# Feed Management System - Visual Diagram

## 🎨 User Interface

```
┌────────────────────────────────────────┐
│  Quickly ▼          ❤️  👤             │  ← Header
├────────────────────────────────────────┤
│  Dropdown Menu (when clicked):        │
│  ┌──────────────────────────────────┐ │
│  │  + New Chat                      │ │
│  ├──────────────────────────────────┤ │
│  │  📱 All Topics  (active - blue)  │ │
│  ├──────────────────────────────────┤ │
│  │  📚 quantum physics          🗑️  │ │
│  ├──────────────────────────────────┤ │
│  │  📚 neural networks          🗑️  │ │
│  ├──────────────────────────────────┤ │
│  │  📚 machine learning         🗑️  │ │
│  └──────────────────────────────────┘ │
├────────────────────────────────────────┤
│                                        │
│  Feed Posts:                           │
│  ┌──────────────────────────────────┐ │
│  │  [Image]                         │ │
│  │                                  │ │
│  │  ❤️ 💬 ✈️                        │ │
│  │                                  │ │
│  │  Liked by Sarah and 1.2K others  │ │
│  │                                  │ │
│  │  Caption: Neural networks...     │ │
│  │                                  │ │
│  │  View all 45 comments            │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

---

## 🗂️ DynamoDB Structure

```
┌─────────────────────────────────────────────────────────┐
│  Table: quickly-posts                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User: alice123 (Firebase UID)                         │
│  ├─ topic: "quantum physics"                           │
│  │  ├─ postId: quantum_1737000000_0                    │
│  │  ├─ postId: quantum_1737000000_1                    │
│  │  ├─ postId: quantum_1737000000_2                    │
│  │  ├─ postId: quantum_1737000000_3                    │
│  │  └─ postId: quantum_1737000000_4                    │
│  │                                                      │
│  ├─ topic: "neural networks"                           │
│  │  ├─ postId: neural_1737001000_0                     │
│  │  ├─ postId: neural_1737001000_1                     │
│  │  ├─ postId: neural_1737001000_2                     │
│  │  ├─ postId: neural_1737001000_3                     │
│  │  └─ postId: neural_1737001000_4                     │
│  │                                                      │
│  └─ topic: "machine learning"                          │
│     ├─ postId: machine_1737002000_0                    │
│     ├─ postId: machine_1737002000_1                    │
│     ├─ postId: machine_1737002000_2                    │
│     ├─ postId: machine_1737002000_3                    │
│     └─ postId: machine_1737002000_4                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Create Feed

```
┌─────────────┐
│   USER      │
│  "teach me  │
│  about AI"  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│   CHATBOT SCREEN    │
│  POST /generateFeed │
└──────┬──────────────┘
       │
       ↓
┌──────────────────────────┐
│   BACKEND (Django)       │
│  1. Call Bedrock AI      │
│  2. Generate 5 posts     │
│  3. Fetch images (S3)    │
└──────┬───────────────────┘
       │
       ↓
┌────────────────────────────┐
│   FRONTEND RECEIVES POSTS  │
│  POST /saveFeedPosts       │
└──────┬─────────────────────┘
       │
       ↓
┌────────────────────────────┐
│   DYNAMODB                 │
│  Save 5 posts:             │
│  - userId: alice123        │
│  - topic: "AI"             │
│  - postId: ai_123_0        │
│  - ...                     │
└──────┬─────────────────────┘
       │
       ↓
┌────────────────────────────┐
│   DROPDOWN UPDATES         │
│  "AI" appears in list      │
└────────────────────────────┘
```

---

## 🔄 Data Flow: View Feed

```
USER CLICKS "quantum physics" IN DROPDOWN
              ↓
┌─────────────────────────────────┐
│  loadFeedData("quantum physics")│
└──────────┬──────────────────────┘
           │
           ↓
┌───────────────────────────────────────┐
│  GET /getFeed?userId=alice123         │
│  Returns all posts                    │
└──────────┬────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  FRONTEND FILTERS:                   │
│  posts.filter(p => p.topic === topic)│
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────┐
│  DISPLAY ONLY:               │
│  - quantum_1737000000_0      │
│  - quantum_1737000000_1      │
│  - quantum_1737000000_2      │
│  - quantum_1737000000_3      │
│  - quantum_1737000000_4      │
└──────────────────────────────┘
```

---

## 🔄 Data Flow: Delete Feed

```
USER CLICKS TRASH ICON 🗑️ NEXT TO "AI"
              ↓
┌──────────────────────────────────┐
│  deleteFeed("AI")                │
└──────────┬───────────────────────┘
           │
           ↓
┌────────────────────────────────────────────┐
│  DELETE /deleteFeed?userId=alice123&topic=AI│
└──────────┬─────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  BACKEND:                       │
│  1. Find all posts with topic=AI│
│  2. Delete each post            │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  DYNAMODB:                      │
│  Delete:                        │
│  - ai_123_0                     │
│  - ai_123_1                     │
│  - ai_123_2                     │
│  - ai_123_3                     │
│  - ai_123_4                     │
└──────────┬──────────────────────┘
           │
           ↓
┌─────────────────────────────────┐
│  FRONTEND:                      │
│  1. Remove "AI" from dropdown   │
│  2. If viewing AI, switch to    │
│     "All Topics"                │
│  3. Reload feed                 │
└─────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│              (React Native + Expo)                   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  chat.tsx │  │chatbot.tsx│  │liked.tsx │          │
│  │ (Feed)   │  │(Generator)│  │ (Likes)  │          │
│  └────┬─────┘  └─────┬─────┘  └─────┬────┘          │
│       │              │              │                │
└───────┼──────────────┼──────────────┼────────────────┘
        │              │              │
        │    HTTP API  │              │
        ▼              ▼              ▼
┌──────────────────────────────────────────────────────┐
│                   BACKEND                            │
│              (Django REST Framework)                 │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              views.py                        │   │
│  │  • generateFeed()                            │   │
│  │  • saveFeedPosts()                           │   │
│  │  • getFeed()                                 │   │
│  │  • getFeedByTopic()  ← NEW                  │   │
│  │  • deleteFeed()       ← NEW                  │   │
│  │  • toggleLike()                              │   │
│  │  • getLikedPosts()                           │   │
│  │  • getTopics()                               │   │
│  └──────────┬───────────────────────────────────┘   │
│             │                                        │
│  ┌──────────▼───────────────────────────────────┐   │
│  │       dynamodb_service.py                    │   │
│  │  • get_user_posts()                          │   │
│  │  • save_posts()                              │   │
│  │  • get_user_topics()                         │   │
│  │  • get_posts_by_topic()  ← NEW              │   │
│  │  • delete_feed()          ← NEW              │   │
│  │  • like_post()                               │   │
│  │  • get_user_likes()                          │   │
│  └──────────┬───────────────────────────────────┘   │
└─────────────┼────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│                   AWS SERVICES                       │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  DynamoDB    │  │   Bedrock    │  │    S3     │  │
│  │              │  │   (Claude/   │  │  (Images) │  │
│  │ quickly-posts│  │    Llama)    │  │           │  │
│  │ quickly-likes│  │              │  │           │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Component Interaction

```
chat.tsx (Feed Screen)
│
├─ State Management
│  ├─ feedPosts: FeedPost[]
│  ├─ topics: string[]
│  └─ currentTopic: string | null
│
├─ Functions
│  ├─ loadFeedData(filterTopic?)
│  │  └─ Fetches topics + posts, optionally filters
│  │
│  ├─ deleteFeed(topic)
│  │  └─ DELETE /deleteFeed, reloads data
│  │
│  └─ toggleLike(index)
│     └─ POST /toggleLike, updates UI
│
└─ UI Components
   ├─ Header with "Quickly ▼"
   ├─ Dropdown Menu
   │  ├─ New Chat button
   │  ├─ All Topics button
   │  └─ Topic list with delete icons
   │
   └─ Scrollable Feed
      └─ Post cards (Instagram style)
```

---

## 🎯 Key Relationships

### Topic ↔ Posts (One-to-Many)
```
Topic: "quantum physics"
  ├─ Post 1: "Quantum entanglement..."
  ├─ Post 2: "Superposition states..."
  ├─ Post 3: "Wave-particle duality..."
  ├─ Post 4: "Quantum tunneling..."
  └─ Post 5: "Heisenberg uncertainty..."
```

### User ↔ Topics (One-to-Many)
```
User: alice123
  ├─ Topic: "quantum physics" (5 posts)
  ├─ Topic: "neural networks" (5 posts)
  └─ Topic: "machine learning" (5 posts)
```

### User ↔ Liked Posts (Many-to-Many)
```
User: alice123
  ├─ Liked: quantum_1737000000_0
  ├─ Liked: neural_1737001000_2
  └─ Liked: machine_1737002000_4
```

---

## 🔐 Authentication Flow

```
┌────────────┐
│   LOGIN    │
│  Firebase  │
└─────┬──────┘
      │
      ↓
┌──────────────────┐
│  Firebase Auth   │
│  Returns: UID    │
└─────┬────────────┘
      │
      ↓
┌────────────────────────┐
│  AsyncStorage          │
│  Store: userId = UID   │
└─────┬──────────────────┘
      │
      ↓
┌────────────────────────────┐
│  All API Calls Include:    │
│  ?userId=<UID>             │
└────────────────────────────┘
```

---

This visual diagram shows how the entire feed management system works together! 🎉
