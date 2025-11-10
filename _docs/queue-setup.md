# Queue Setup Guide

## Overview

The Tutor Quality Scoring System uses Bull queue with Redis for asynchronous job processing. This guide covers setting up Redis (local or Upstash) and accessing queue monitoring.

## Redis Setup

### Option 1: Local Redis (Development)

1. **Install Redis locally**:
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

2. **Set environment variable**:
   ```bash
   REDIS_URL=redis://localhost:6379
   ```

### Option 2: Upstash Redis (Production/Serverless)

1. **Create Upstash account**:
   - Go to https://upstash.com/
   - Sign up for a free account
   - Create a new Redis database

2. **Get connection string**:
   - Go to Upstash Console > Your Redis Database
   - Click "REST API" tab
   - Copy the `.env` format connection string
   - It will look like: `rediss://default:password@host:port`

3. **Set environment variable**:
   ```bash
   REDIS_URL=rediss://default:password@host:port
   ```
   Note: `rediss://` (with double 's') indicates TLS/SSL connection

4. **Upstash Free Tier**:
   - 10,000 requests/day
   - Perfect for development and testing
   - Pay-as-you-go for production

## Queue Monitoring

### API Endpoints

**Queue Status** (JSON):
```
GET /api/admin/queue/status
```

Returns:
```json
{
  "queues": [
    {
      "name": "session-processing",
      "waiting": 0,
      "active": 0,
      "completed": 10,
      "failed": 0,
      "delayed": 0,
      "total": 10
    }
  ],
  "summary": {
    "totalWaiting": 0,
    "totalActive": 0,
    "totalCompleted": 10,
    "totalFailed": 0,
    "totalDelayed": 0
  },
  "timestamp": "2025-11-07T12:00:00.000Z"
}
```

### Bull Board UI (Future)

Full Bull Board UI requires custom server setup. For now, use the status API endpoint for programmatic monitoring.

To add full Bull Board UI:
1. Set up custom Next.js server with Express
2. Mount Bull Board Express adapter
3. Access at `/api/admin/queue`

## Running Workers

### Start Worker Process

```bash
pnpm queue:worker
```

This starts the Bull queue worker that processes jobs from the queue.

### Process Existing Sessions

```bash
pnpm queue:process-sessions
```

This backfills flags for existing sessions in the database.

## Queue Configuration

### Priority Queues

- **High Priority**: Critical jobs (first sessions, critical flags)
- **Normal Priority**: Regular session processing
- **Low Priority**: Batch jobs (analytics, trends)

### Retry Logic

- **Attempts**: 3 retries per job
- **Backoff**: Exponential (starts at 2 seconds)
- **Failed Jobs**: Kept for 24 hours
- **Completed Jobs**: Kept for 1 hour (last 1000)

## Troubleshooting

### Queue Not Processing Jobs

1. **Check Redis connection**:
   ```bash
   # Test Redis connection
   redis-cli ping
   # Should return: PONG
   ```

2. **Verify environment variable**:
   ```bash
   echo $REDIS_URL
   ```

3. **Check worker is running**:
   ```bash
   pnpm queue:worker
   ```

4. **Check queue status**:
   ```bash
   curl http://localhost:3000/api/admin/queue/status
   ```

### Upstash Connection Issues

1. **Verify TLS connection**: Use `rediss://` (not `redis://`)
2. **Check credentials**: Ensure password is correct
3. **Check rate limits**: Free tier has 10K requests/day
4. **Upgrade plan**: If hitting limits, upgrade to pay-as-you-go

### Jobs Failing

1. **Check worker logs**: Look for error messages
2. **Check job data**: Verify job payload is valid
3. **Check database connection**: Ensure database is accessible
4. **Check retry count**: Failed jobs are retried 3 times

## Environment Variables

Add to `.env.local`:

```bash
# Redis (Upstash or Local)
REDIS_URL=redis://localhost:6379  # Local
# or
REDIS_URL=rediss://default:password@host:port  # Upstash
```

See `.env.example` for all required environment variables.

