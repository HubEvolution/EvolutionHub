#!/bin/bash

# Navigate to the E2E test directory
cd "$(dirname "$0")/../tests/e2e"

# Install E2E dependencies
echo "Setting up E2E test environment..."
npm install

echo "E2E test environment setup complete!"
echo "To run E2E tests, use: npm test"
