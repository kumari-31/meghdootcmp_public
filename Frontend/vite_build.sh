#!/bin/bash
set -e  # exit immediately on error

# ==============================
# PATH CONFIGURATION
# ==============================
FRONTEND_DIR="/home/boss/Desktop/Cmp19nov25/Frontend"
DIST_DIR="$FRONTEND_DIR/dist"

BACKEND_DIR="/home/boss/Desktop/Cmp19nov25/Backend/Unified_Proect_Api"
STATIC_DIR="$BACKEND_DIR/static"
TEMPLATE_DIR="$BACKEND_DIR/templates/"

echo "=============================="
echo " React build → Django deploy "
echo "=============================="

# ==============================
# 1. Delete old dist folder
# ==============================
echo ">>> Removing old React dist folder"
rm -rf "$DIST_DIR"

# ==============================
# 2. Build React app
# ==============================
echo ">>> Running npm run build"
cd "$FRONTEND_DIR"
npm run build

# ==============================
# 3. Clean Django static folder
# ==============================
echo ">>> Cleaning Django static folder"
rm -rf "$STATIC_DIR"/*

# ==============================
# 4. Clean Django template folder
# ==============================
echo ">>> Cleaning Django template folder"
rm -rf "$TEMPLATE_DIR"/*

# ==============================
# 5. Copy build output
# ==============================
echo ">>> Copying React build to Django"

# Copy everything EXCEPT index.html to static
rsync -av --exclude='index.html' "$DIST_DIR/" "$STATIC_DIR/"

# Copy index.html to templates
cp "$DIST_DIR/index.html" "$TEMPLATE_DIR/"

# Add Django static loader at the top
echo "=== Adding '{% load static %}' to index.html ==="
sed -i '1s/^/{% load static %}\n/' "$TEMPLATE_DIR/index.html"

# ==============================
# 6. Collect static files
# ==============================
#echo ">>> Running collectstatic"
#cd "$BACKEND_DIR"
#python3 manage.py collectstatic --noinput

echo "=============================="
echo " Build & deploy completed ✅"
echo "=============================="
