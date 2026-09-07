#!/usr/bin/env fish

set root (status dirname)

echo "Starting Cognis..."
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop."
echo ""

# Start backend
uv run --directory $root/backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
set -g backend_pid $lastpid

# Start frontend (must cd before backgrounding)
bash -c "cd $root/frontend && npx vite --host" &
set -g frontend_pid $lastpid

# Block
sleep infinity
