#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "Starting Cognis..."

# Backend
echo "Starting backend on :8000..."
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo "Starting frontend on :5173..."
cd frontend
npx vite --host &
FRONTEND_PID=$!
cd ..

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
