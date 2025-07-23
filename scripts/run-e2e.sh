#!/bin/bash

# Start the development server in the background
cd "$(dirname "$0")/.."
nohup npm run dev > /dev/null 2>&1 & 
DEV_SERVER_PID=$!

# Wait for the server to start
echo "Waiting for the development server to start..."
sleep 10

# Run the E2E tests
echo "Running E2E tests..."
cd tests/e2e
npm test
TEST_EXIT_CODE=$?

# Stop the development server
kill $DEV_SERVER_PID

# Exit with the test status code
exit $TEST_EXIT_CODE
