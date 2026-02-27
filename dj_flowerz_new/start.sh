#!/bin/bash

# DJ Flowerz - Quick Start Script
# This script will help you get the application running

echo "🎵 DJ Flowerz - Firebase Integration Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the project root directory:"
    echo "cd /Users/DJFLOWERZ/Downloads/dj_flowerz"
    exit 1
fi

echo "✅ Found package.json"
echo ""

# Check disk space
echo "📊 Checking disk space..."
available_space=$(df -h . | awk 'NR==2 {print $4}')
echo "Available space: $available_space"
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "⚠️  node_modules directory exists"
    echo "Do you want to remove it and reinstall? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "🗑️  Removing node_modules..."
        rm -rf node_modules package-lock.json
        echo "✅ Cleaned up"
    fi
fi

echo ""
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
echo ""

# Install dependencies
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 Starting development server..."
    echo ""
    npm run dev
else
    echo ""
    echo "❌ Installation failed!"
    echo ""
    echo "Possible solutions:"
    echo "1. Free up disk space (need ~1GB)"
    echo "2. Clear npm cache: npm cache clean --force"
    echo "3. Try installing again: npm install --legacy-peer-deps"
    echo ""
    echo "For more help, see FIREBASE_INTEGRATION_GUIDE.md"
fi
