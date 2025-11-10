# Manual Testing Guide

This guide provides step-by-step instructions for manually testing the API endpoints we've built.

## Prerequisites

1. **Development server running**:
   ```bash
   pnpm dev
   ```

2. **Environment variables set** (in `.env.local`):
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_URL` - Redis connection string (for rate limiting)
   - `WEBHOOK_SECRET` - Secret for HMAC signature verification
   
   **Note**: `WEBHOOK_SECRET` is stored in `.env.local` and will be automatically loaded by Next.js when running `pnpm dev`. For manual testing with curl, you'll need to read it from `.env.local` to generate valid signatures.

3. **Database has test data**:
   ```bash
   pnpm db:seed
   ```

---

## Quick Reference: Mock Session Data

Pre-formatted mock session payloads are available in `_docs/mock-session-data.json`. Use the helper script to extract them:

```bash
# List all available mock sessions
./scripts/get-mock-session.sh --list

# Get a specific session payload (formatted JSON)
./scripts/get-mock-session.sh "Basic Successful Session"

# Get as single-line string (for curl)
PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string)
```

## Quick Reference: Generating Webhook Signatures

Since `WEBHOOK_SECRET` is stored in `.env.local`, use the helper script to generate signatures:

```bash
# Option 1: Use mock session data
PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string)
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Option 2: Create your own test payload
PAYLOAD='{"session_id":"test_123","tutor_id":"tutor_456",...}'
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Use in curl requests
curl -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Alternative**: Export the secret manually for repeated use in the same shell session:
```bash
export WEBHOOK_SECRET=$(grep "^WEBHOOK_SECRET=" .env.local | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//")
```

---

## 1. Webhook Endpoint Testing

### Test 1.1: Valid Webhook Request

**Endpoint**: `POST /api/webhooks/session-completed`

**Steps**:
1. Generate a valid HMAC signature:
   ```bash
   # Option 1: Use mock session data (recommended)
   PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string)
   SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")
   echo "Signature: $SIGNATURE"
   
   # Option 2: Create your own test payload
   PAYLOAD='{"session_id":"test_123","tutor_id":"tutor_456","student_id":"student_789","session_start_time":"2025-11-09T10:00:00Z","session_end_time":"2025-11-09T11:00:00Z","tutor_join_time":"2025-11-09T10:00:00Z","student_join_time":"2025-11-09T10:00:00Z","tutor_leave_time":"2025-11-09T11:00:00Z","student_leave_time":"2025-11-09T11:00:00Z","subjects_covered":["Math"],"is_first_session":false,"was_rescheduled":false,"tutor_feedback":{"rating":5,"description":"Great session"},"student_feedback":{"rating":5,"description":"Excellent"}}'
   SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")
   echo "Signature: $SIGNATURE"
   
   # Option 3: Export secret from .env.local manually (for repeated use in same session)
   export WEBHOOK_SECRET=$(grep "^WEBHOOK_SECRET=" .env.local | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//")
   SIGNATURE=$(node -e "const crypto=require('crypto');console.log(crypto.createHmac('sha256',process.env.WEBHOOK_SECRET).update(process.argv[1]).digest('hex'))" "$PAYLOAD")
   echo "Signature: $SIGNATURE"
   ```

2. Send request with valid signature:
   ```bash
   # Use the signature generated above
   curl -X POST http://localhost:3000/api/webhooks/session-completed \
     -H "Content-Type: application/json" \
     -H "X-Signature: $SIGNATURE" \
     -d "$PAYLOAD"
   ```

**Expected Result**: 
- Status: `200 OK`
- Response: `{"success":true,"session_id":"test_123","queued":true}`
- Check database: Session should be stored
- Check queue: Job should be queued

### Test 1.2: Invalid Signature

**Steps**:
```bash
curl -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Signature: invalid-signature" \
  -d "$PAYLOAD"
```

**Expected Result**: 
- Status: `401 Unauthorized`
- Response: `{"error":"Unauthorized","message":"Invalid signature"}`

### Test 1.3: Missing Signature Header

**Steps**:
```bash
curl -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

**Expected Result**: 
- Status: `401 Unauthorized`
- Response: `{"error":"Unauthorized","message":"Missing signature header"}`

### Test 1.4: Invalid Payload

**Steps**:
```bash
curl -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Signature: <any-signature>" \
  -d '{"session_id":"","invalid":"data"}'
```

**Expected Result**: 
- Status: `400 Bad Request`
- Response: `{"error":"Invalid payload","details":[...]}`

### Test 1.5: Duplicate Session ID

**Steps**:
1. Send same request twice (with same `session_id`)
2. First request should succeed (200)
3. Second request should fail (409)

**Expected Result**: 
- First: `200 OK`
- Second: `409 Conflict` with `{"error":"Session already exists","session_id":"test_123"}`

---

## 2. Rate Limiting Testing

**Note**: For these tests, you'll need a valid signature. Generate one using the helper script:
```bash
PAYLOAD='{"session_id":"test_123",...}'  # Your test payload
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")
```

### Test 2.1: Rate Limit Headers

**Endpoint**: `POST /api/webhooks/session-completed`

**Steps**:
```bash
# Option 1: Use mock session data (recommended)
PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string | jq -c '.session_id = "session_rl_test_'$(date +%s)'"')
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Option 2: Use the test script
./scripts/test-rate-limit.sh 5

# Option 3: Manual check
curl -i -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$PAYLOAD" | grep -E "X-RateLimit|HTTP/1.1"
```

**Expected Result**: 
- Status: `200 OK`
- Check response headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: <number>` (decreases with each request)
  - `X-RateLimit-Reset: <ISO timestamp>` (when the rate limit window resets)

### Test 2.2: Rate Limit Exceeded

**Steps**:
1. Send 101 requests rapidly (within 1 minute)
2. First 100 should succeed
3. 101st should fail

**Option 1: Use the test script (recommended)**:
```bash
# Test with 101 requests to hit the limit
./scripts/test-rate-limit.sh 101
```

**Option 2: Manual test**:
```bash
# Generate signature first (use mock session data)
PAYLOAD=$(./scripts/get-mock-session.sh "Basic Successful Session" --string | jq -c '.session_id = "session_rl_test_'$(date +%s)'"')
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Send 101 requests
for i in {1..101}; do
  # Generate unique session_id for each request
  NEW_PAYLOAD=$(echo "$PAYLOAD" | jq -c ".session_id = \"session_rl_test_$(date +%s)_${i}\"")
  NEW_SIGNATURE=$(./scripts/generate-webhook-signature.sh "$NEW_PAYLOAD")
  
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X POST http://localhost:3000/api/webhooks/session-completed \
    -H "Content-Type: application/json" \
    -H "X-Signature: $NEW_SIGNATURE" \
    -d "$NEW_PAYLOAD")
  
  echo "Request $i: HTTP $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "429" ]; then
    echo "⚠️  Rate limit hit at request $i"
    break
  fi
  
  sleep 0.05
done
```

**Expected Result**: 
- First 100: `200 OK`
- 101st: `429 Too Many Requests`
- Response: `{"error":"Too Many Requests","message":"Rate limit exceeded. Please try again later."}`
- Headers include:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 0`
  - `X-RateLimit-Reset: <ISO timestamp>`
  - `Retry-After: <seconds>`

### Test 2.3: Rate Limit Reset

**Steps**:
1. Hit rate limit (101 requests)
2. Wait 61 seconds
3. Send another request

**Expected Result**: 
- Should succeed (rate limit reset)

---

## 3. Session Endpoints Testing

### Test 3.1: List All Sessions

**Endpoint**: `GET /api/sessions`

**Steps**:
```bash
# Basic request - list all sessions (default limit: 50)
curl http://localhost:3000/api/sessions | jq

# With limit specified
curl "http://localhost:3000/api/sessions?limit=10" | jq

# Pretty print with jq to see structure
curl -s http://localhost:3000/api/sessions | jq '.pagination'
curl -s http://localhost:3000/api/sessions | jq '.sessions[0]'  # First session
```

**Expected Result**: 
- Status: `200 OK`
- Response structure:
  ```json
  {
    "sessions": [
      {
        "id": "uuid",
        "session_id": "session_001_2025-11-09",
        "tutor_id": "tutor_alice_smith",
        "student_id": "student_john_doe",
        "session_start_time": "2025-11-09T14:00:00.000Z",
        "session_end_time": "2025-11-09T15:00:00.000Z",
        "tutor_join_time": "2025-11-09T14:00:00.000Z",
        "student_join_time": "2025-11-09T14:00:00.000Z",
        "tutor_leave_time": "2025-11-09T15:00:00.000Z",
        "student_leave_time": "2025-11-09T15:00:00.000Z",
        "subjects_covered": ["Math", "Algebra"],
        "is_first_session": false,
        "session_type": null,
        "session_length_scheduled": 60,
        "session_length_actual": 60,
        "was_rescheduled": false,
        "rescheduled_by": null,
        "reschedule_count": 0,
        "tutor_feedback_rating": 4,
        "tutor_feedback_description": "...",
        "student_feedback_rating": 5,
        "student_feedback_description": "...",
        "video_url": "https://example.com/videos/...",
        "transcript_url": "https://example.com/transcripts/...",
        "ai_summary": "...",
        "student_booked_followup": null,
        "created_at": "2025-11-10T00:16:30.963Z",
        "updated_at": "2025-11-10T00:16:30.963Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 15
    }
  }
  ```
- Sessions ordered by `session_start_time` DESC (most recent first)
- Default limit: 50 sessions per page
- Maximum limit: 100 sessions per page

### Test 3.2: Filter by Tutor ID

**Steps**:
```bash
# First, get a tutor_id from the sessions list
TUTOR_ID=$(curl -s http://localhost:3000/api/sessions | jq -r '.sessions[0].tutor_id')
echo "Testing with tutor_id: $TUTOR_ID"

# Filter by tutor_id
curl "http://localhost:3000/api/sessions?tutor_id=$TUTOR_ID" | jq

# Verify all sessions belong to this tutor
curl -s "http://localhost:3000/api/sessions?tutor_id=$TUTOR_ID" | jq '.sessions[] | .tutor_id' | sort -u
```

**Expected Result**: 
- Status: `200 OK`
- All returned sessions have `tutor_id` matching the filter
- Only one unique `tutor_id` in results (the filtered one)
- Pagination total reflects filtered count

### Test 3.3: Filter by Date Range

**Steps**:
```bash
# Filter by date range (ISO 8601 format required)
curl "http://localhost:3000/api/sessions?start_date=2025-11-01T00:00:00Z&end_date=2025-11-09T23:59:59Z" | jq

# Get current date range from existing sessions
FIRST_SESSION=$(curl -s http://localhost:3000/api/sessions | jq -r '.sessions[-1].session_start_time')
LAST_SESSION=$(curl -s http://localhost:3000/api/sessions | jq -r '.sessions[0].session_start_time')
echo "Testing with date range: $FIRST_SESSION to $LAST_SESSION"

# Filter with actual date range
curl "http://localhost:3000/api/sessions?start_date=$FIRST_SESSION&end_date=$LAST_SESSION" | jq

# Verify all sessions are within date range
curl -s "http://localhost:3000/api/sessions?start_date=2025-11-01T00:00:00Z&end_date=2025-11-09T23:59:59Z" | \
  jq '.sessions[] | .session_start_time' | \
  jq -s 'map(select(. >= "2025-11-01T00:00:00Z" and . <= "2025-11-09T23:59:59Z")) | length'
```

**Expected Result**: 
- Status: `200 OK`
- All returned sessions have `session_start_time` within the date range
- `start_date` is inclusive (sessions >= start_date)
- `end_date` is inclusive (sessions <= end_date)
- Can combine with other filters (tutor_id, student_id, etc.)

### Test 3.4: Filter by First Session

**Steps**:
```bash
# Filter for first sessions only
curl "http://localhost:3000/api/sessions?is_first_session=true" | jq

# Filter for non-first sessions
curl "http://localhost:3000/api/sessions?is_first_session=false" | jq

# Verify all results are first sessions
curl -s "http://localhost:3000/api/sessions?is_first_session=true" | \
  jq '.sessions[] | .is_first_session' | \
  jq -s 'map(select(. == true)) | length'
```

**Expected Result**: 
- Status: `200 OK`
- All returned sessions have `is_first_session: true` (when filtering for true)
- All returned sessions have `is_first_session: false` (when filtering for false)
- Can combine with other filters

### Test 3.5: Pagination

**Steps**:
```bash
# First page (limit 10, offset 0)
curl "http://localhost:3000/api/sessions?limit=10&offset=0" | jq '.pagination'
curl "http://localhost:3000/api/sessions?limit=10&offset=0" | jq '.sessions | length'

# Second page (limit 10, offset 10)
curl "http://localhost:3000/api/sessions?limit=10&offset=10" | jq '.pagination'
curl "http://localhost:3000/api/sessions?limit=10&offset=10" | jq '.sessions | length'

# Verify pagination consistency
TOTAL=$(curl -s "http://localhost:3000/api/sessions?limit=10&offset=0" | jq -r '.pagination.total')
echo "Total sessions: $TOTAL"

# Get first session ID from page 1
PAGE1_FIRST=$(curl -s "http://localhost:3000/api/sessions?limit=10&offset=0" | jq -r '.sessions[0].session_id')
# Get first session ID from page 2
PAGE2_FIRST=$(curl -s "http://localhost:3000/api/sessions?limit=10&offset=10" | jq -r '.sessions[0].session_id')
echo "Page 1 first session: $PAGE1_FIRST"
echo "Page 2 first session: $PAGE2_FIRST"
# They should be different
```

**Expected Result**: 
- First page: 10 sessions (or less if total < 10)
- Second page: Next 10 sessions (different from first page)
- `pagination.total` should be consistent across pages
- `pagination.limit` matches the requested limit
- `pagination.offset` matches the requested offset
- Sessions are ordered by `session_start_time` DESC (most recent first)

### Test 3.6: Invalid Pagination Parameters

**Steps**:
```bash
# Invalid limit (too high - max is 100)
curl "http://localhost:3000/api/sessions?limit=200" | jq

# Invalid limit (too low - min is 1)
curl "http://localhost:3000/api/sessions?limit=0" | jq

# Invalid offset (negative)
curl "http://localhost:3000/api/sessions?offset=-1" | jq

# Invalid date format
curl "http://localhost:3000/api/sessions?start_date=invalid-date" | jq
```

**Expected Result**: 
- Status: `400 Bad Request`
- Response structure:
  ```json
  {
    "error": "Invalid query parameters",
    "details": [
      {
        "field": "limit",
        "message": "Number must be less than or equal to 100"
      }
    ]
  }
  ```
- Each invalid parameter has a corresponding error in `details` array

### Test 3.7: Get Session Detail

**Endpoint**: `GET /api/sessions/[id]`

**Note**: The `[id]` parameter is the `session_id` (not the database UUID `id`).

**Steps**:
```bash
# Get a session_id from the list endpoint first
SESSION_ID=$(curl -s http://localhost:3000/api/sessions | jq -r '.sessions[0].session_id')
echo "Testing with session_id: $SESSION_ID"

# Get session detail
curl "http://localhost:3000/api/sessions/$SESSION_ID" | jq

# Pretty print specific fields
curl -s "http://localhost:3000/api/sessions/$SESSION_ID" | jq '.session | {session_id, tutor_id, student_id, session_start_time, subjects_covered}'
```

**Expected Result**: 
- Status: `200 OK`
- Response structure:
  ```json
  {
    "session": {
      "id": "uuid",
      "session_id": "session_001_2025-11-09",
      "tutor_id": "tutor_alice_smith",
      "student_id": "student_john_doe",
      "session_start_time": "2025-11-09T14:00:00.000Z",
      "session_end_time": "2025-11-09T15:00:00.000Z",
      "tutor_join_time": "2025-11-09T14:00:00.000Z",
      "student_join_time": "2025-11-09T14:00:00.000Z",
      "tutor_leave_time": "2025-11-09T15:00:00.000Z",
      "student_leave_time": "2025-11-09T15:00:00.000Z",
      "subjects_covered": ["Math", "Algebra"],
      "is_first_session": false,
      "session_type": null,
      "session_length_scheduled": 60,
      "session_length_actual": 60,
      "was_rescheduled": false,
      "rescheduled_by": null,
      "reschedule_count": 0,
      "tutor_feedback_rating": 4,
      "tutor_feedback_description": "...",
      "student_feedback_rating": 5,
      "student_feedback_description": "...",
      "video_url": "https://example.com/videos/...",
      "transcript_url": "https://example.com/transcripts/...",
      "ai_summary": "...",
      "student_booked_followup": null,
      "created_at": "2025-11-10T00:16:30.963Z",
      "updated_at": "2025-11-10T00:16:30.963Z"
    }
  }
  ```

### Test 3.8: Non-existent Session

**Steps**:
```bash
# Try to get a session that doesn't exist
curl "http://localhost:3000/api/sessions/nonexistent_session_12345" | jq

# Or use a clearly invalid session_id
curl "http://localhost:3000/api/sessions/this_session_does_not_exist_999" | jq
```

**Expected Result**: 
- Status: `404 Not Found`
- Response:
  ```json
  {
    "error": "Not Found",
    "message": "Session with ID 'nonexistent_session_12345' not found"
  }
  ```

### Test 3.9: Combined Filters

**Steps**:
```bash
# Combine multiple filters: tutor_id + date range
TUTOR_ID=$(curl -s http://localhost:3000/api/sessions | jq -r '.sessions[0].tutor_id')
curl "http://localhost:3000/api/sessions?tutor_id=$TUTOR_ID&start_date=2025-11-01T00:00:00Z&end_date=2025-11-09T23:59:59Z" | jq

# Combine filters: tutor_id + is_first_session
curl "http://localhost:3000/api/sessions?tutor_id=$TUTOR_ID&is_first_session=true" | jq

# Combine all filters with pagination
curl "http://localhost:3000/api/sessions?tutor_id=$TUTOR_ID&start_date=2025-11-01T00:00:00Z&end_date=2025-11-09T23:59:59Z&is_first_session=false&limit=5&offset=0" | jq
```

**Expected Result**: 
- Status: `200 OK`
- All filters are applied together (AND logic)
- Pagination works with filtered results
- `pagination.total` reflects the filtered count

---

## 4. Queue Monitoring Testing

### Test 4.1: Queue Status Endpoint

**Endpoint**: `GET /api/admin/queue/status`

**Steps**:
```bash
# Use the provided test script
./scripts/test-queue-monitoring.sh

# Or manually:
curl http://localhost:3000/api/admin/queue/status | jq
```

**Expected Result**: 
- Status: `200 OK`
- Response structure:
  ```json
  {
    "queues": [...],
    "summary": {
      "totalWaiting": 0,
      "totalActive": 0,
      "totalCompleted": <number>,
      "totalFailed": 0,
      "totalDelayed": 0
    },
    "timestamp": "..."
  }
  ```

---

## 5. Integration Testing

### Test 5.1: End-to-End Webhook Flow

**Steps**:
1. Send a valid webhook request
2. Verify session is stored in database:
   ```bash
   # Check database directly or use sessions API
   curl "http://localhost:3000/api/sessions?tutor_id=<tutor_id>" | jq
   ```
3. Verify job is queued:
   ```bash
   curl http://localhost:3000/api/admin/queue/status | jq
   ```
4. Verify session detail endpoint works:
   ```bash
   curl "http://localhost:3000/api/sessions/<session_id>" | jq
   ```

**Expected Result**: 
- Session appears in database
- Job appears in queue
- Session detail endpoint returns the session

---

## 6. Error Handling Testing

### Test 6.1: Database Connection Failure

**Steps**:
1. Stop database or set invalid `DATABASE_URL`
2. Send request to sessions endpoint

**Expected Result**: 
- Status: `500 Internal Server Error`
- Response: `{"error":"Internal server error","message":"Failed to fetch sessions"}`

### Test 6.2: Redis Connection Failure (Rate Limiting)

**Steps**:
1. Stop Redis or set invalid `REDIS_URL`
2. Send webhook request

**Expected Result**: 
- Request should still succeed (fail open)
- Check logs for rate limit error message

---

## 7. Performance Testing

### Test 7.1: Response Time

**Steps**:
```bash
# Generate signature first
PAYLOAD='{"session_id":"test_123","tutor_id":"tutor_456","student_id":"student_789","session_start_time":"2025-11-09T10:00:00Z","session_end_time":"2025-11-09T11:00:00Z","tutor_join_time":"2025-11-09T10:00:00Z","student_join_time":"2025-11-09T10:00:00Z","tutor_leave_time":"2025-11-09T11:00:00Z","student_leave_time":"2025-11-09T11:00:00Z","subjects_covered":["Math"],"is_first_session":false,"was_rescheduled":false,"tutor_feedback":{"rating":5,"description":"Great session"},"student_feedback":{"rating":5,"description":"Excellent"}}'
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Time webhook endpoint
time curl -X POST http://localhost:3000/api/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Result**: 
- Response time < 2 seconds (webhook requirement)

### Test 7.2: Concurrent Requests

**Steps**:
```bash
# Generate signature first
PAYLOAD='{"session_id":"test_123","tutor_id":"tutor_456","student_id":"student_789","session_start_time":"2025-11-09T10:00:00Z","session_end_time":"2025-11-09T11:00:00Z","tutor_join_time":"2025-11-09T10:00:00Z","student_join_time":"2025-11-09T10:00:00Z","tutor_leave_time":"2025-11-09T11:00:00Z","student_leave_time":"2025-11-09T11:00:00Z","subjects_covered":["Math"],"is_first_session":false,"was_rescheduled":false,"tutor_feedback":{"rating":5,"description":"Great session"},"student_feedback":{"rating":5,"description":"Excellent"}}'
SIGNATURE=$(./scripts/generate-webhook-signature.sh "$PAYLOAD")

# Send 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/webhooks/session-completed \
    -H "Content-Type: application/json" \
    -H "X-Signature: $SIGNATURE" \
    -d "$PAYLOAD" &
done
wait
```

**Expected Result**: 
- All requests should succeed
- All sessions should be stored
- No race conditions

---

## Checklist

- [ ] Webhook endpoint accepts valid requests
- [ ] Webhook endpoint rejects invalid signatures
- [ ] Webhook endpoint rejects missing signatures
- [ ] Webhook endpoint validates payload
- [ ] Webhook endpoint handles duplicate sessions
- [ ] Rate limiting works (100 req/min)
- [ ] Rate limit headers are present
- [ ] Rate limit resets after window
- [ ] Sessions list endpoint returns data
- [ ] Sessions list filtering works (tutor_id, date range, is_first_session)
- [ ] Sessions list pagination works
- [ ] Session detail endpoint returns data
- [ ] Session detail endpoint returns 404 for non-existent sessions
- [ ] Queue status endpoint works
- [ ] Error handling works (database errors, invalid params)
- [ ] Response times are acceptable (< 2s for webhook)

---

## Troubleshooting

### Issue: Webhook signature verification fails
- **Check**: `WEBHOOK_SECRET` is set in `.env.local` (Next.js loads this automatically)
- **Check**: When generating signatures manually, you're using the same secret from `.env.local`
- **Check**: Signature is generated with same secret that's in `.env.local`
- **Check**: Payload matches exactly (no extra whitespace)
- **Check**: If using the export method, ensure the secret value doesn't have quotes or extra whitespace: `export WEBHOOK_SECRET=$(grep WEBHOOK_SECRET .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")`

### Issue: Rate limiting not working
- **Check**: `REDIS_URL` is set correctly
- **Check**: Redis is accessible
- **Check**: Rate limit headers in response

### Issue: Sessions not appearing
- **Check**: Database connection
- **Check**: Sessions were actually created (check database directly)
- **Check**: Date range filters are correct

### Issue: Queue status shows errors
- **Check**: Redis connection
- **Check**: Bull queue is initialized correctly
- **Check**: Workers are running (if applicable)

---

## Next Steps

After manual testing is complete:
1. Document any issues found
2. Fix any bugs discovered
3. Update integration tests if needed
4. Proceed with remaining Phase 6 tasks (tutor endpoints, flag endpoints)

