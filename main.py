#!/usr/bin/env python3
"""
Tree Visualization App - Main Entry Point
This script serves as the main entry point for the Tree Visualization application.
It initializes the Flask server and opens a browser window for the user.
"""

import os
import sys
import threading
import time
from backend.app import app, open_browser

def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)

def main():
    """Main function to start the application"""
    # Start the browser in a separate thread
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    # Start the Flask server
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)

if __name__ == "__main__":
    main()
