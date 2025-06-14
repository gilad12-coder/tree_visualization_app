"""
TreeVisualizationApp Launcher - Backend Only
This script serves as the entry point for the TreeVisualizationApp backend
"""

import os
import sys
import logging
from app import app

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("TreeVisualizationApp")

def start_app():
    """Start the Flask application (backend only)"""
    try:
        logger.info("Successfully imported Flask app")
    except ImportError as e:
        logger.error(f"Failed to import Flask app: {e}")
        print(f"ERROR: Could not import Flask app: {e}")
        input("Press Enter to exit...")
        sys.exit(1)
    
    # Print app information
    logger.info(f"Starting TreeVisualizationApp Backend...")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Python executable: {sys.executable}")
    
    # Print startup message
    print("\n" + "=" * 80)
    print(f"TreeVisualizationApp Backend is starting...")
    print(f"Backend API will be available at: http://localhost:5001/")
    print("Frontend serving is disabled for now.")
    print("Press CTRL+C to stop the server.")
    print("=" * 80 + "\n")
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
        print("\nServer stopped.")
    except Exception as e:
        logger.error(f"Error starting Flask server: {e}")
        print(f"ERROR: Could not start server: {e}")
        input("Press Enter to exit...")
        sys.exit(1)

if __name__ == "__main__":
    start_app()