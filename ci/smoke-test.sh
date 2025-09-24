#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-5000}
BASE="http://localhost:${PORT}"
export JWT_SECRET=${JWT_SECRET:-ci_test_secret}
export REDIS_HOST=${REDIS_HOST:-127.0.0.1}
export REDIS_PORT=${REDIS_PORT:-6379}

echo "Environment: PORT=$PORT, REDIS_HOST=$REDIS_HOST, REDIS_PORT=$REDIS_PORT"

# Install dependencies
echo "Installing dependencies..."
npm ci --silent
(cd backend && npm ci --silent)

# Start server
echo "Starting backend server..."
node backend/server.js > server.log 2>&1 &
SERVER_PID=$!
sleep 1

# Start runner
echo "Starting runner..."
( cd backend && node runner.js > runner.log 2>&1 ) &
RUNNER_PID=$!

# Wait for server health
echo "Waiting for server to become healthy at $BASE/health..."
for i in $(seq 1 30); do
  if curl -sSf "$BASE/health" >/dev/null 2>&1; then
    echo "Server healthy"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Server did not become healthy. Dumping server.log:"; tail -n +1 server.log; exit 2
  fi
  sleep 1
done

# Sanity endpoints
echo "Fetching templates..."
curl -sSf "$BASE/api/pipeline/templates" -o /tmp/templates.json || { echo "Failed to fetch templates"; tail -n +1 server.log; exit 2; }
cat /tmp/templates.json | jq -r '.[0].id // "(no templates)"'

echo "Creating mock subscriber..."
curl -sSf -X POST "$BASE/api/subscribe" -H "Content-Type: application/json" -d '{"email":"ci+smoke@example.com"}' -o /tmp/subscribe.json || { echo "Subscribe failed"; tail -n +1 server.log; exit 2; }
cat /tmp/subscribe.json

echo "Listing users..."
curl -sSf "$BASE/api/users" -o /tmp/users.json || { echo "Get users failed"; tail -n +1 server.log; exit 2; }
cat /tmp/users.json | jq -r '.[0].email // "(no users)"'

# Enqueue a demo job
echo "Enqueueing demo job..."
JOB_JSON=$(curl -s -X POST "$BASE/api/pipeline/run" -H "Content-Type: application/json" -d '{"steps":["echo \"ci smoke\"","node -v"]}')
JOB_ID=$(echo "$JOB_JSON" | jq -r '.id // empty')
if [ -z "$JOB_ID" ]; then
  echo "Failed to enqueue job. Response: $JOB_JSON"; tail -n +1 server.log; tail -n +1 backend/runner.log || true; exit 2
fi

echo "Job queued: $JOB_ID"

# Poll job status until completed or failed
STATUS=""
for i in $(seq 1 60); do
  STATUS=$(curl -s "$BASE/api/pipeline/job/$JOB_ID" | jq -r '.state // "unknown"')
  echo "($i) Job $JOB_ID status: $STATUS"
  if [ "$STATUS" = "completed" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  sleep 1
done

# Fetch logs
echo "Job logs:"
curl -s "$BASE/api/pipeline/logs/$JOB_ID" || true

# Cleanup
echo "Stopping processes: server=$SERVER_PID runner=$RUNNER_PID"
kill $RUNNER_PID || true
kill $SERVER_PID || true

if [ "$STATUS" != "completed" ]; then
  echo "Job did not complete successfully (status: $STATUS)"; exit 3
fi

echo "Smoke tests passed."
exit 0
