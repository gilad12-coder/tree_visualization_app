"""
Build script for creating the TreeVisualizationApp executable
This script automates the process of building the executable using PyInstaller
"""

import os
import sys
import subprocess
import platform

def main():
    """Main function to build the executable"""
    print("Building TreeVisualizationApp executable...")
    
    # Ensure we're in the project root directory
    project_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_root)
    
    # Install requirements
    print("Installing requirements...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Build the executable
    print("Building executable with PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "PyInstaller", "app.spec"])
    
    # Check if build was successful
    dist_dir = os.path.join(project_root, "dist")
    if platform.system() == "Windows":
        exe_path = os.path.join(dist_dir, "TreeVisualizationApp.exe")
    else:
        exe_path = os.path.join(dist_dir, "TreeVisualizationApp")
    
    if os.path.exists(exe_path):
        print(f"Build successful! Executable created at: {exe_path}")
        print("You can run the application by executing the file directly or using the batch file.")
    else:
        print("Build failed. Check the PyInstaller output for errors.")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
