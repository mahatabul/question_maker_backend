#!/bin/bash

# Start Express (background)
cd backend
npm run dev &

# Start FastAPI inside WSL
wsl bash -c "cd ../py_backend && source venv/bin/activate && uvicorn main:app --reload"

wait