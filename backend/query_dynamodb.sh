#!/bin/bash

# Script to query DynamoDB data for a user

echo "🔍 DynamoDB Query Helper"
echo ""

# Check if user_id is provided
if [ -z "$1" ]; then
    echo "Usage: ./query_dynamodb.sh <firebase-user-id>"
    echo ""
    echo "Example: ./query_dynamodb.sh abc123xyz"
    exit 1
fi

USER_ID=$1

echo "📦 Querying data for user: $USER_ID"
echo ""

# 1. Get all posts for user
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 POSTS for user $USER_ID:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws dynamodb query \
    --table-name quickly-posts \
    --key-condition-expression "userId = :uid" \
    --expression-attribute-values "{\":uid\":{\"S\":\"$USER_ID\"}}" \
    --output table

echo ""
echo ""

# 2. Get all likes for user
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❤️  LIKES for user $USER_ID:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
aws dynamodb query \
    --table-name quickly-likes \
    --key-condition-expression "userId = :uid" \
    --expression-attribute-values "{\":uid\":{\"S\":\"$USER_ID\"}}" \
    --output table

echo ""
echo "✅ Query complete!"
