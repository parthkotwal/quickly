#!/bin/bash

# Backend API Test Script
# Tests all endpoints with a test user

echo "=========================================="
echo "🧪 TESTING QUICKLY BACKEND API"
echo "=========================================="
echo ""

# Configuration
API_URL="http://localhost:8000/api"
TEST_USER_ID="test-user-r@gmail.com"
TOPIC1="Machine Learning"
TOPIC2="Python Programming"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Test User ID: ${TEST_USER_ID}${NC}"
echo ""

# Test 1: Health Check
echo -e "${BLUE}[1/7] Testing Health Check...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    exit 1
fi
echo ""

# Test 2: Generate Feed
echo -e "${BLUE}[2/7] Generating Feed for '${TOPIC1}'...${NC}"
FEED_RESPONSE=$(curl -s -X POST "${API_URL}/generateFeed" \
  -H "Content-Type: application/json" \
  -d "{\"topic\": \"${TOPIC1}\"}")

# Extract first post for later use
FIRST_POST=$(echo "$FEED_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['posts'][0]))" 2>/dev/null)

if echo "$FEED_RESPONSE" | grep -q "Machine Learning"; then
    echo -e "${GREEN}✓ Feed generated successfully${NC}"

    # Check if S3 URLs are used
    if echo "$FEED_RESPONSE" | grep -q "s3.amazonaws.com"; then
        echo -e "${GREEN}✓ Images uploaded to S3${NC}"
    else
        echo -e "${RED}⚠ Images are hotlinks, not S3 URLs (check AWS credentials)${NC}"
    fi
else
    echo -e "${RED}✗ Feed generation failed${NC}"
    echo "$FEED_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Save Posts to DynamoDB
echo -e "${BLUE}[3/7] Saving Posts to DynamoDB...${NC}"
SAVE_RESPONSE=$(curl -s -X POST "${API_URL}/saveFeedPosts" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER_ID}\", \"topic\": \"${TOPIC1}\", \"posts\": [${FIRST_POST}]}")

if echo "$SAVE_RESPONSE" | grep -q "Posts saved successfully"; then
    echo -e "${GREEN}✓ Posts saved to DynamoDB${NC}"

    # Extract postId for later use
    POST_ID=$(echo "$SAVE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['posts'][0]['postId'])" 2>/dev/null)
    echo -e "  PostID: ${POST_ID}"
else
    echo -e "${RED}✗ Save posts failed${NC}"
    echo "$SAVE_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Feed from DynamoDB
echo -e "${BLUE}[4/7] Retrieving Feed from DynamoDB...${NC}"
GET_FEED_RESPONSE=$(curl -s "${API_URL}/getFeed?userId=${TEST_USER_ID}")

if echo "$GET_FEED_RESPONSE" | grep -q "Machine Learning"; then
    echo -e "${GREEN}✓ Feed retrieved from DynamoDB${NC}"
    POST_COUNT=$(echo "$GET_FEED_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['posts']))" 2>/dev/null)
    echo -e "  Posts count: ${POST_COUNT}"
else
    echo -e "${RED}✗ Get feed failed${NC}"
    echo "$GET_FEED_RESPONSE"
    exit 1
fi
echo ""

# Test 5: Like a Post
echo -e "${BLUE}[5/7] Liking a Post...${NC}"
LIKE_RESPONSE=$(curl -s -X POST "${API_URL}/toggleLike" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER_ID}\", \"postId\": \"${POST_ID}\", \"postData\": ${FIRST_POST}, \"action\": \"like\"}")

if echo "$LIKE_RESPONSE" | grep -q "liked successfully"; then
    echo -e "${GREEN}✓ Post liked successfully${NC}"
else
    echo -e "${RED}✗ Like post failed${NC}"
    echo "$LIKE_RESPONSE"
    exit 1
fi
echo ""

# Test 6: Get Liked Posts
echo -e "${BLUE}[6/7] Retrieving Liked Posts...${NC}"
LIKED_RESPONSE=$(curl -s "${API_URL}/getLikedPosts?userId=${TEST_USER_ID}")

if echo "$LIKED_RESPONSE" | grep -q "posts"; then
    echo -e "${GREEN}✓ Liked posts retrieved${NC}"
    LIKED_COUNT=$(echo "$LIKED_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['posts']))" 2>/dev/null)
    echo -e "  Liked posts count: ${LIKED_COUNT}"
else
    echo -e "${RED}✗ Get liked posts failed${NC}"
    echo "$LIKED_RESPONSE"
    exit 1
fi
echo ""

# Add a second topic for topics test
echo -e "${BLUE}Saving second topic...${NC}"
curl -s -X POST "${API_URL}/saveFeedPosts" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"${TEST_USER_ID}\", \"topic\": \"${TOPIC2}\", \"posts\": [{\"text\": \"Python test\", \"imageUrl\": \"https://example.com/test.jpg\", \"imageQuery\": \"python\"}]}" > /dev/null

# Test 7: Get Topics
echo -e "${BLUE}[7/7] Retrieving Topics...${NC}"
TOPICS_RESPONSE=$(curl -s "${API_URL}/getTopics?userId=${TEST_USER_ID}")

if echo "$TOPICS_RESPONSE" | grep -q "Machine Learning"; then
    echo -e "${GREEN}✓ Topics retrieved${NC}"
    echo -e "  Topics: $(echo $TOPICS_RESPONSE | python3 -c 'import sys, json; data=json.load(sys.stdin); print(\", \".join(data[\"topics\"]))' 2>/dev/null)"
else
    echo -e "${RED}✗ Get topics failed${NC}"
    echo "$TOPICS_RESPONSE"
    exit 1
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo "  - Health check: ✓"
echo "  - Feed generation: ✓"
echo "  - Save to DynamoDB: ✓"
echo "  - Retrieve feed: ✓"
echo "  - Like post: ✓"
echo "  - Get liked posts: ✓"
echo "  - Get topics: ✓"
echo ""
echo "🎉 Backend is fully functional!"
echo ""
echo "💾 Data stored in:"
echo "  - DynamoDB tables: quickly-posts, quickly-likes"
echo "  - S3 bucket: quickly-images"
echo ""
