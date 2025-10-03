#!/bin/bash
# Build script for Tree Visualization App
# Creates standalone executable with all dependencies

set -e  # Exit on error

echo "=========================================="
echo "Tree Visualization App - Build Script"
echo "=========================================="
echo ""

# Step 1: Install Python dependencies
echo "[1/4] Installing Python dependencies..."
pip install -r requirements.txt
echo "✓ Python dependencies installed"
echo ""

# Step 2: Install Node.js dependencies
echo "[2/4] Installing Node.js dependencies..."
npm install
echo "✓ Node.js dependencies installed"
echo ""

# Step 3: Build React frontend
echo "[3/4] Building React frontend (this may take a minute)..."
echo "  - Updating browserslist database..."
npx update-browserslist-db@latest --yes 2>/dev/null || true
echo "  - Building React app..."
npm run build
echo "✓ React frontend built successfully"
echo ""

# Step 4: Build executable with PyInstaller
echo "[4/4] Building standalone executable..."
pyinstaller app.spec
echo "✓ Executable built successfully"
echo ""

echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "Your executable is located at:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  dist/TreeVisualizationApp/TreeVisualizationApp.exe"
else
    echo "  dist/TreeVisualizationApp/TreeVisualizationApp"
fi
echo ""
echo "To run the application:"
echo "  cd dist/TreeVisualizationApp"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  TreeVisualizationApp.exe"
else
    echo "  ./TreeVisualizationApp"
fi
echo ""
