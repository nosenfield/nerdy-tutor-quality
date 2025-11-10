#!/bin/bash
# Generate HMAC signature for webhook testing
# 
# Usage:
#   ./scripts/generate-webhook-signature.sh '<payload>'
#   ./scripts/generate-webhook-signature.sh "$PAYLOAD"
#
# Example:
#   PAYLOAD='{"session_id":"test_123","tutor_id":"tutor_456"}'
#   ./scripts/generate-webhook-signature.sh "$PAYLOAD"

set -e

# Check if payload is provided
if [ -z "$1" ]; then
  echo "Error: Payload is required"
  echo "Usage: $0 '<payload>'"
  exit 1
fi

PAYLOAD="$1"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "Error: .env.local file not found"
  exit 1
fi

# Read WEBHOOK_SECRET from .env.local
# Handle both quoted and unquoted values
WEBHOOK_SECRET=$(grep "^WEBHOOK_SECRET=" .env.local | cut -d '=' -f2- | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//")

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "Error: WEBHOOK_SECRET not found in .env.local"
  exit 1
fi

# Generate signature using Node.js
node -e "
  const crypto = require('crypto');
  const secret = process.argv[1];
  const payload = process.argv[2];
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  console.log(signature);
" "$WEBHOOK_SECRET" "$PAYLOAD"

