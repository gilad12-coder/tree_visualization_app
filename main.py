#!/usr/bin/env python3
"""
be-net - Main Entry Point

This script serves as the main entry point for be-net.
It initializes the Flask server and opens a browser window for the user.
When the browser closes, the application will automatically exit.
"""

import os
import sys
import threading
import time
import subprocess
import signal
import platform
from typing import List, Optional
from backend.app import app, open_browser


def resource_path(relative_path: str) -> str:
    """
    Get absolute path to a resource file.
    
    Works for both development and PyInstaller bundled executables.
    PyInstaller creates a temporary folder and stores the path in sys._MEIPASS.
    
    Args:
        relative_path (str): The relative path to the resource file.
    
    Returns:
        str: The absolute path to the resource file.
    """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)


def get_browser_processes() -> List[str]:
    """
    Get list of browser processes that might have opened the application URL.
    
    Attempts to find processes associated with localhost:5001 on both macOS
    and Windows platforms. Returns an empty list if no processes are found
    or if the check fails.
    
    Returns:
        List[str]: A list of process identifiers or process information strings.
                  Returns an empty list if no processes are found or on error.
    """
    processes: List[str] = []
    try:
        if platform.system() == 'Darwin':
            result = subprocess.run(
                ['pgrep', '-fl', 'localhost:5001'],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0:
                processes = result.stdout.strip().split('\n')
        elif platform.system() == 'Windows':
            result = subprocess.run(
                ['tasklist', '/FI', 'WINDOWTITLE eq *localhost:5001*'],
                capture_output=True,
                text=True,
                timeout=2
            )
            if 'localhost:5001' in result.stdout:
                processes = result.stdout.strip().split('\n')
    except Exception:
        pass
    return processes


def monitor_browser() -> None:
    """
    Monitor browser connection status and exit application when browser closes.
    
    This function runs in a background thread and periodically checks if there
    are active connections to port 5001. Once a browser connection is detected,
    it monitors for disconnection. If the browser closes (no connections for
    a sustained period), the application will automatically exit.
    
    The monitoring starts after a 5-second delay to allow the browser time to
    open and establish a connection. It checks every 3 seconds and will exit
    after 10 consecutive checks (30 seconds) with no browser connection.
    
    Returns:
        None: This function runs indefinitely until the application exits.
    """
    time.sleep(5)
    
    browser_opened: bool = False
    check_interval: int = 3
    no_browser_count: int = 0
    max_no_browser_checks: int = 10
    
    while True:
        try:
            if platform.system() == 'Darwin':
                result = subprocess.run(
                    ['lsof', '-ti:5001'],
                    capture_output=True,
                    text=True,
                    timeout=1
                )
                has_connections = len(result.stdout.strip()) > 0
            else:
                has_connections = True
            
            if has_connections:
                browser_opened = True
                no_browser_count = 0
            else:
                if browser_opened:
                    no_browser_count += 1
                    if no_browser_count >= max_no_browser_checks:
                        print("Browser closed. Exiting application...")
                        os._exit(0)
            
            time.sleep(check_interval)
        except Exception:
            time.sleep(check_interval)


def main() -> None:
    """
    Main entry point for be-net.
    
    Initializes and starts the Flask server, opens the default web browser,
    and sets up monitoring to automatically exit when the browser closes.
    Also registers signal handlers for graceful shutdown on SIGINT/SIGTERM.
    
    The function:
    1. Starts a background thread to monitor browser connections
    2. Starts a background thread to open the browser
    3. Registers signal handlers for graceful shutdown
    4. Starts the Flask development server on port 5001
    
    Returns:
        None: This function runs the server indefinitely until interrupted
              or until the browser monitoring detects browser closure.
    """
    monitor_thread = threading.Thread(target=monitor_browser)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()
    
    def signal_handler(sig: int, frame: Optional[object]) -> None:
        """
        Handle shutdown signals gracefully.
        
        Args:
            sig (int): The signal number received.
            frame (Optional[object]): The current stack frame.
        
        Returns:
            None
        """
        print("\nShutting down...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=False, threaded=True, use_reloader=False)
    except KeyboardInterrupt:
        print("\nShutting down...")
        sys.exit(0)


if __name__ == "__main__":
    main()
