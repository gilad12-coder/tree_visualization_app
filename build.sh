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
echo "[4/5] Building standalone executable..."
pyinstaller app.spec
echo "✓ Executable built successfully"
echo ""

# Step 5: Create macOS .app bundle (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "[5/5] Creating macOS .app bundle..."
    python3 create_app_bundle.py
    echo ""
fi

echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "Your executable is located at:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  dist/TreeVisualizationApp.app (macOS app bundle)"
    echo ""
    echo "To run the application:"
    echo "  open dist/TreeVisualizationApp.app"
    echo "  Or double-click the .app file in Finder"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  dist/TreeVisualizationApp.exe"
    echo ""
    echo "To run the application:"
    echo "  dist/TreeVisualizationApp.exe"
    echo "  Or double-click the .exe file in Windows Explorer"
else
    echo "  dist/TreeVisualizationApp"
    echo ""
    echo "To run the application:"
    echo "  ./dist/TreeVisualizationApp"
fi
echo ""
