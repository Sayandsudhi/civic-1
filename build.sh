#!/usr/bin/env bash
# Exit on any error
set -o errexit

echo "==> [1/3] Installing Python backend dependencies..."
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> [2/3] Installing Node.js frontend dependencies..."
cd frontend
npm install

echo "==> [3/3] Building production frontend bundle..."
npm run build
cd ..

echo "==> Build complete! CivicPulse AI is ready for launch."
