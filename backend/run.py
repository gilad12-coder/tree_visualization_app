#!/usr/bin/env python
"""
TreeVisualizationApp Launcher
This script serves as the entry point for the TreeVisualizationApp
"""

import os
import sys
import time
import webbrowser
import threading
import logging
from app import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("TreeVisualizationApp")

def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
        logger.info(f"Using PyInstaller _MEIPASS path: {base_path}")
    except Exception:
        base_path = os.path.abspath(".")
        logger.info(f"Using current directory as base path: {base_path}")
    
    return os.path.join(base_path, relative_path)

def check_frontend_files():
    """Check if the React frontend files exist"""
    build_folder = resource_path('build')
    index_html = os.path.join(build_folder, 'index.html')
    
    if not os.path.exists(build_folder):
        logger.warning(f"Build folder not found at: {build_folder}")
        return False
    
    if not os.path.exists(index_html):
        logger.warning(f"index.html not found at: {index_html}")
        return False
    
    logger.info(f"Frontend files found. Build folder: {build_folder}")
    return True

def open_browser_delayed():
    """Open the browser after a delay to ensure server is running"""
    time.sleep(2.5)  # Give the server time to start
    logger.info("Opening browser...")
    try:
        webbrowser.open_new('http://localhost:5001/')
        logger.info("Browser opened successfully")
    except Exception as e:
        logger.error(f"Failed to open browser: {e}")

def start_app():
    """Start the Flask application"""
    # Import the Flask app here to avoid circular imports
    try:
        logger.info("Successfully imported Flask app from main.py")
    except ImportError as e:
        logger.error(f"Failed to import Flask app: {e}")
        print(f"ERROR: Could not import Flask app: {e}")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Print app information
    logger.info(f"Starting TreeVisualizationApp...")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Static folder path: {getattr(app, 'static_folder', 'Not set')}")
    logger.info(f"Python executable: {sys.executable}")
    
    # Check if frontend exists
    has_frontend = check_frontend_files()
    if not has_frontend:
        logger.warning("Frontend files not found. The application may not work correctly.")
    
    # Start browser in a separate thread
    browser_thread = threading.Thread(target=open_browser_delayed)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Print startup message
    print("\n" + "=" * 80)
    print(f"TreeVisualizationApp is starting...")
    print(f"The application will be available at: http://localhost:5001/")
    print("The browser will open automatically once the server is ready.")
    print("=" * 80 + "\n")
    
    try:
        # Run the Flask app
        app.run(host='0.0.0.0', port=5001, use_reloader=False)
    except Exception as e:
        logger.error(f"Error starting Flask server: {e}")
        print(f"ERROR: Could not start server: {e}")
        input("Press Enter to exit...")
        sys.exit(1)

if __name__ == "__main__":
    start_app()