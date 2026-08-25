@echo off
REM Build script for be-net (Windows)
REM Creates standalone executable with all dependencies

echo ==========================================
echo be-net - Build Script
echo ==========================================
echo.

REM Step 1: Install Python dependencies
echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b %errorlevel%
)
echo - Python dependencies installed
echo.

REM Step 2: Install Node.js dependencies
echo [2/4] Installing Node.js dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b %errorlevel%
)
echo - Node.js dependencies installed
echo.

REM Step 3: Build React frontend
echo [3/4] Building React frontend (this may take a minute)...
echo   - Updating browserslist database...
call npx update-browserslist-db@latest --yes 2>nul
echo   - Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Failed to build React frontend
    pause
    exit /b %errorlevel%
)
echo - React frontend built successfully
echo.

REM Step 4: Build executable with PyInstaller
echo [4/4] Building standalone executable...
pyinstaller app.spec
if %errorlevel% neq 0 (
    echo ERROR: Failed to build executable
    pause
    exit /b %errorlevel%
)
echo - Executable built successfully
echo.

echo ==========================================
echo Build completed successfully!
echo ==========================================
echo.
echo Your executable is located at:
echo   dist\be-net.exe
echo.
echo To run the application:
echo   dist\be-net.exe
echo.
echo Or double-click the .exe file in Windows Explorer
echo.
pause
