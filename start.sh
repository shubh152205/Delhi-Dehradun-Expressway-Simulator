#!/bin/sh
set -e

echo "=== Starting Delhi-Dehradun Expressway Simulator ==="

# Start C++ backend in background
echo "Starting C++ backend on port 8080..."
cd /app/backend
./server &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to initialize..."
sleep 2

# Verify backend is alive
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "Backend started successfully (PID: $BACKEND_PID)"
else
    echo "ERROR: Backend failed to start!"
    exit 1
fi

# Start Node.js frontend
echo "Starting frontend proxy on port ${PORT:-3000}..."
cd /app
exec node app.js
