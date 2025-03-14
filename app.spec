# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs

block_cipher = None

# Add the project root and backend folder to the Python path
project_root = os.path.abspath('.')
backend_folder = os.path.abspath('backend')
sys.path.append(project_root)
sys.path.append(backend_folder)

# Path to the entry point script
main_path = os.path.join('backend', 'run.py')  # Use the run.py from backend folder

# Verify the run.py file exists
if not os.path.exists(main_path):
    print(f"WARNING: Entry point {main_path} not found!")
    print("Make sure the run.py file exists in the backend directory.")

# Verify React build directory exists and contains the necessary files
build_dir = os.path.join(project_root, 'build')
if not os.path.exists(build_dir):
    print(f"WARNING: React build directory not found at {build_dir}")
    print("The application may not run correctly. Make sure to build the React frontend first.")
else:
    index_html = os.path.join(build_dir, 'index.html')
    if not os.path.exists(index_html):
        print(f"WARNING: index.html not found in {build_dir}")
        print("The React application may not have been built correctly.")

# Ensure all frontend files are explicitly included
print(f"Adding React build files from: {build_dir}")
frontend_files = []
if os.path.exists(build_dir):
    # Walk through the build directory and add all files
    for root, dirs, files in os.walk(build_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, project_root)
            target_path = os.path.dirname(rel_path)
            frontend_files.append((file_path, target_path))
    print(f"Added {len(frontend_files)} frontend files")

# Collect backend data files
backend_data = collect_data_files('backend')

# Collect public files (like favicons, etc.)
public_dir = os.path.join(project_root, 'public')
public_files = []
if os.path.exists(public_dir):
    for file in os.listdir(public_dir):
        file_path = os.path.join(public_dir, file)
        if os.path.isfile(file_path):
            public_files.append((file_path, 'public'))

# Additional data files
additional_data = []
if os.path.exists('README.md'):
    additional_data.append(('README.md', '.'))

# Create a small browser helper script
with open(os.path.join(project_root, 'browser_helper.py'), 'w') as f:
    f.write("""
import time
import webbrowser
time.sleep(2)  # Give the server more time to start up
webbrowser.open_new('http://localhost:5001/')
""")
additional_data.append((os.path.join(project_root, 'browser_helper.py'), '.'))

# Collect all dynamic libraries that might be needed
dylibs = collect_dynamic_libs('ctypes')

a = Analysis(
    [main_path],
    pathex=[project_root, backend_folder],
    binaries=dylibs,  # Add dylibs here
    datas=backend_data + frontend_files + public_files + additional_data,
    hiddenimports=[
        # Core application modules
        'main',  # Import main.py as a module
        
        # Backend modules
        'backend.models', 'backend.utils', 'backend.report_service', 
        
        # Core dependencies
        'webbrowser', 'flask', 'flask_cors', 'pandas', 'sqlalchemy', 'sqlite3', 
        'openpyxl', 'networkx', 'fpdf', 'reportlab',
        
        # Explicitly include problematic packages
        'ctypes', '_ctypes',
        
        # Fix package names that caused "hidden import not found" errors
        'dateutil', 'python-dateutil', 'PIL', 'PIL.Image',  
        
        # Supporting modules
        'threading', 'datetime', 'json',
        
        # Ensure all backend modules are included
        'backend'
    ] + collect_submodules('backend') + collect_submodules('ctypes'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',  # Exclude matplotlib entirely
        'pyi_rth_mplconfig',  # Exclude the matplotlib runtime hook
        'PyQt5',  # Often used with matplotlib
        'qt5',
        'tkinter'  # Not needed if not using GUI
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# Change the output directory to avoid the circular reference
exe = EXE(
    pyz,
    a.scripts,
    [],  # Important: Don't include a.binaries, a.zipfiles, a.datas here
    exclude_binaries=True,  # This is important to avoid the circular reference
    name='TreeVisualizationApp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Show console for debugging; change to False for production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='public/favicon.ico' if os.path.exists('public/favicon.ico') else None,
)

# Create a directory with all the binaries 
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TreeVisualizationApp'
)