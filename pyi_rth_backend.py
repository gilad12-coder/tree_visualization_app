"""
PyInstaller runtime hook to fix backend module imports.
This adds the backend directory to sys.path so that 'from models import ...' works.
"""
import sys
import os

# Get the directory where the executable is running
if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle
    bundle_dir = sys._MEIPASS
    backend_dir = os.path.join(bundle_dir, 'backend')

    # Add backend directory to sys.path so 'from models import' works
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
