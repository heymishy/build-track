#!/bin/bash

# Clean development environment script
# Kills all processes on common development ports and starts fresh

echo "🧹 Cleaning development environment..."

# Kill processes on common Next.js ports
echo "🔪 Killing processes on ports 3000-3006..."
for port in {3000..3006}; do
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    fuser -k $port/tcp 2>/dev/null || true
done

# Kill Next.js dev processes by name
echo "🔪 Killing Next.js dev processes..."
pkill -f "next dev" 2>/dev/null || true
ps aux | grep -i next | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Clean Next.js cache
echo "🗑️ Cleaning Next.js cache..."
rm -rf .next

echo "✅ Environment cleaned!"
echo "🚀 You can now run 'npm run dev' safely"