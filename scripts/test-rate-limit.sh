#!/bin/bash
# Test rate limiting on webhook endpoint
# 
# This script sends multiple requests to test rate limiting
# Expected: First 100 requests succeed, 101st should fail with 429

set -e

# Check if number of requests is provided
NUM_REQUESTS=${1:-5}

echo "Testing rate limiting (100 requests/minute limit)..."
echo "Sending $NUM_REQUESTS requests to check rate limit headers..."
echo ""

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0
ERROR_COUNT=0
DUPLICATE_COUNT=0

for i in $(seq 1 $NUM_REQUESTS); do
  # Generate new session ID for each request to avoid duplicate errors
  NEW_SESSION_ID="session_rl_test_$(date +%s)_${i}_$$"
  PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string | jq -c ".session_id = \"$NEW_SESSION_ID\"")
  SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")
  
  # Make request and capture headers
  RESPONSE=$(curl -s -D /tmp/headers_$$ -w "\nHTTP_CODE:%{http_code}\n" -X POST http://localhost:3000/api/webhooks/session-completed \
    -H "Content-Type: application/json" \
    -H "X-Signature: $SIGNATURE" \
    -d "$PAYLOAD")
  
  HTTP_CODE=$(grep "HTTP_CODE" <<< "$RESPONSE" | cut -d: -f2 | tr -d '\r\n ')
  BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
  
  # Extract rate limit headers
  REMAINING=$(grep -i "x-ratelimit-remaining" /tmp/headers_$$ 2>/dev/null | awk '{print $2}' | tr -d '\r\n ' || echo "N/A")
  LIMIT=$(grep -i "x-ratelimit-limit" /tmp/headers_$$ 2>/dev/null | awk '{print $2}' | tr -d '\r\n ' || echo "N/A")
  RESET=$(grep -i "x-ratelimit-reset" /tmp/headers_$$ 2>/dev/null | awk '{print $2}' | tr -d '\r\n ' || echo "N/A")
  
  if [ "$i" -le 5 ] || [ "$i" -eq "$NUM_REQUESTS" ] || [ "$HTTP_CODE" = "429" ]; then
    echo "Request $i:"
    echo "  HTTP Status: $HTTP_CODE"
    echo "  Rate Limit: $REMAINING/$LIMIT remaining"
    if [ "$RESET" != "N/A" ]; then
      echo "  Reset: $RESET"
    fi
  fi
  
  if [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    if [ "$i" -le 5 ] || [ "$i" -eq "$NUM_REQUESTS" ]; then
      echo "  ⚠️  Rate limited!"
    fi
  elif [ "$HTTP_CODE" = "409" ]; then
    DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
  else
    ERROR_COUNT=$((ERROR_COUNT + 1))
    if [ "$i" -le 5 ] || [ "$i" -eq "$NUM_REQUESTS" ]; then
      echo "  ❌ Error: $(echo "$BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown")"
    fi
  fi
  
  # Show progress for large batches
  if [ "$NUM_REQUESTS" -gt 10 ] && [ $((i % 10)) -eq 0 ]; then
    echo "  Progress: $i/$NUM_REQUESTS (Remaining: $REMAINING)"
  fi
  
  sleep 0.05
  rm -f /tmp/headers_$$
done

echo ""
echo "Summary:"
echo "  ✅ Successful: $SUCCESS_COUNT"
echo "  ⚠️  Rate Limited (429): $RATE_LIMITED_COUNT"
echo "  🔄 Duplicate (409): $DUPLICATE_COUNT"
echo "  ❌ Errors: $ERROR_COUNT"
echo ""
echo "Rate Limit Status:"
echo "  Limit: 100 requests/minute"
echo "  Remaining: $REMAINING"
echo ""
if [ "$RATE_LIMITED_COUNT" -eq 0 ] && [ "$NUM_REQUESTS" -lt 100 ]; then
  echo "ℹ️  To test hitting the limit, run:"
  echo "  ./scripts/test-rate-limit.sh 101"
fi

