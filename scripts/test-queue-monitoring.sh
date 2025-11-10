#!/bin/bash

# Test Queue Monitoring API
# Tests the queue status endpoint to verify monitoring is working

echo "Testing Queue Monitoring API..."
echo ""

BASE_URL="${1:-http://localhost:3000}"
ENDPOINT="${BASE_URL}/api/admin/queue/status"

echo "Testing endpoint: ${ENDPOINT}"
echo ""

# Test the endpoint
response=$(curl -s -w "\n%{http_code}" "${ENDPOINT}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status: ${http_code}"
echo ""

if [ "$http_code" -eq 200 ]; then
  echo "✅ Endpoint is accessible"
  echo ""
  echo "Response:"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  
  # Check if response has expected structure
  if echo "$body" | grep -q '"queues"'; then
    echo "✅ Response contains 'queues' field"
  else
    echo "❌ Response missing 'queues' field"
  fi
  
  if echo "$body" | grep -q '"summary"'; then
    echo "✅ Response contains 'summary' field"
  else
    echo "❌ Response missing 'summary' field"
  fi
  
  if echo "$body" | grep -q '"timestamp"'; then
    echo "✅ Response contains 'timestamp' field"
  else
    echo "❌ Response missing 'timestamp' field"
  fi
else
  echo "❌ Endpoint returned error: ${http_code}"
  echo "Response: ${body}"
  exit 1
fi

echo ""
echo "Test complete!"

