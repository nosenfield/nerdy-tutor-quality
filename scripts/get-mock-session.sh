#!/bin/bash
# Extract mock session payloads from mock-session-data.json
#
# Usage:
#   ./scripts/get-mock-session.sh <session-name>
#   ./scripts/get-mock-session.sh "Basic Successful Session"
#
# Options:
#   -l, --list    List all available session names
#   -j, --json    Output as JSON (default)
#   -s, --string  Output as single-line string (for curl)
#   -n, --name    Include session name and description

set -e

MOCK_DATA_FILE="_docs/mock-session-data.json"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed."
  echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

# Check if mock data file exists
if [ ! -f "$MOCK_DATA_FILE" ]; then
  echo "Error: Mock data file not found: $MOCK_DATA_FILE"
  exit 1
fi

# List all available sessions
if [ "$1" = "-l" ] || [ "$1" = "--list" ]; then
  echo "Available mock sessions:"
  echo ""
  jq -r '.sessions[] | "  - \(.name)\n    \(.description)"' "$MOCK_DATA_FILE"
  exit 0
fi

# Get session name from argument
SESSION_NAME="${1:-Basic Successful Session}"

# Check if session exists
if ! jq -e ".sessions[] | select(.name == \"$SESSION_NAME\")" "$MOCK_DATA_FILE" > /dev/null 2>&1; then
  echo "Error: Session '$SESSION_NAME' not found."
  echo ""
  echo "Available sessions:"
  jq -r '.sessions[] | "  - \(.name)"' "$MOCK_DATA_FILE"
  exit 1
fi

# Output format
OUTPUT_FORMAT="${2:-json}"

# Extract and output payload
if [ "$OUTPUT_FORMAT" = "string" ] || [ "$OUTPUT_FORMAT" = "-s" ] || [ "$OUTPUT_FORMAT" = "--string" ]; then
  # Output as single-line JSON string (for curl)
  jq -c ".sessions[] | select(.name == \"$SESSION_NAME\") | .payload" "$MOCK_DATA_FILE"
elif [ "$OUTPUT_FORMAT" = "name" ] || [ "$OUTPUT_FORMAT" = "-n" ] || [ "$OUTPUT_FORMAT" = "--name" ]; then
  # Output with name and description
  jq ".sessions[] | select(.name == \"$SESSION_NAME\")" "$MOCK_DATA_FILE"
else
  # Output as formatted JSON (default)
  jq ".sessions[] | select(.name == \"$SESSION_NAME\") | .payload" "$MOCK_DATA_FILE"
fi

