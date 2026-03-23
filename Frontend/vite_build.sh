#!/bin/bash
set -e

# Use the current directory instead of hardcoded paths
FRONTEND_DIR=$(pwd)
DIST_DIR="$FRONTEND_DIR/dist"

echo "=============================="
echo " Starting Vite Build "
echo "=============================="

# 1. Clean old build
rm -rf "$DIST_DIR"

# 2. Build React app
# Using npx ensures it works even if vite isn't global
npm run build || npx vite build

echo "Build completed successfully in $DIST_DIR"
