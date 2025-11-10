#!/bin/bash

# Script to push environment variables from .env.local to Vercel
# Usage: ./scripts/vercel-env-push.sh [environment]
# Environment: production, preview, development (default: production)

ENVIRONMENT=${1:-production}
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

echo "============================================"
echo "Pushing environment variables to Vercel"
echo "Environment: $ENVIRONMENT"
echo "============================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Count variables
VAR_COUNT=$(grep -v '^#' "$ENV_FILE" | grep -v '^$' | grep '=' | wc -l | tr -d ' ')
echo "Found $VAR_COUNT environment variables in $ENV_FILE"
echo ""

# Read .env.local and add each variable
ADDED=0
SKIPPED=0
ERRORS=0

while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # Skip if key or value is empty
    [[ -z "$key" ]] && continue
    [[ -z "$value" ]] && continue
    
    echo -n "Adding $key... "
    
    # Add to Vercel (non-interactive)
    if echo "$value" | vercel env add "$key" "$ENVIRONMENT" --yes 2>/dev/null; then
        echo "✅"
        ((ADDED++))
    else
        # Check if it already exists
        if vercel env ls "$ENVIRONMENT" 2>/dev/null | grep -q "^$key"; then
            echo "⏭️  (already exists)"
            ((SKIPPED++))
        else
            echo "❌ (error)"
            ((ERRORS++))
        fi
    fi
done < <(grep -v '^#' "$ENV_FILE" | grep '=')

echo ""
echo "============================================"
echo "Summary:"
echo "  ✅ Added: $ADDED"
echo "  ⏭️  Skipped: $SKIPPED"
echo "  ❌ Errors: $ERRORS"
echo "============================================"

if [ $ERRORS -eq 0 ]; then
    echo ""
    echo "✅ Environment variables pushed successfully!"
    echo "   View them at: https://vercel.com/[your-project]/settings/environment-variables"
else
    echo ""
    echo "⚠️  Some variables failed to add. You may need to add them manually."
fi

