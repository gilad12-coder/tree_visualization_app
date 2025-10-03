# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Tree Visualization App
This builds a standalone executable with embedded React frontend
"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, collect_dynamic_libs

# Get the project root directory
project_root = os.path.abspath('.')

# Verify main.py exists
if not os.path.exists('main.py'):
    print("ERROR: main.py not found!")
    sys.exit(1)

# Verify React build directory exists
build_dir = os.path.join(project_root, 'build')
if not os.path.exists(build_dir):
    print("\n" + "="*80)
    print("WARNING: React build directory not found!")
    print("You MUST run 'npm run build' before building the executable.")
    print("The build/ directory must exist and contain the compiled React app.")
    print("="*80 + "\n")
    sys.exit(1)

# Verify critical React files exist
required_files = ['index.html', 'static']
for file in required_files:
    if not os.path.exists(os.path.join(build_dir, file)):
        print(f"ERROR: Required file/folder '{file}' not found in build/")
        print("Please run 'npm run build' to create the React build.")
        sys.exit(1)

print(f"✓ Found React build directory: {build_dir}")
print(f"✓ Entry point: main.py")

# Collect all React build files recursively
build_files = []
for root, dirs, files in os.walk(build_dir):
    for file in files:
        file_path = os.path.join(root, file)
        # Calculate relative path from build directory
        rel_path = os.path.relpath(root, build_dir)
        if rel_path == '.':
            dest_path = 'build'
        else:
            dest_path = os.path.join('build', rel_path)
        build_files.append((file_path, dest_path))

print(f"✓ Collected {len(build_files)} React build files")

# Collect public assets (favicons, icons, etc.)
public_dir = os.path.join(project_root, 'public')
public_files = []
if os.path.exists(public_dir):
    for file in os.listdir(public_dir):
        file_path = os.path.join(public_dir, file)
        if os.path.isfile(file_path):
            public_files.append((file_path, 'public'))
    print(f"✓ Collected {len(public_files)} public assets")

# Additional documentation files
additional_data = []
if os.path.exists('README.md'):
    additional_data.append(('README.md', '.'))

# Collect backend modules and data files
backend_modules = collect_submodules('backend')

# Collect backend fonts directory if it exists
backend_fonts = []
backend_fonts_dir = os.path.join(project_root, 'backend', 'fonts')
if os.path.exists(backend_fonts_dir):
    for root, dirs, files in os.walk(backend_fonts_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(root, project_root)
            backend_fonts.append((file_path, rel_path))
    if backend_fonts:
        print(f"✓ Collected {len(backend_fonts)} backend font files")

# Collect Flask dependencies
flask_data = collect_data_files('flask')
werkzeug_data = collect_data_files('werkzeug')

# Hidden imports (packages that PyInstaller might miss)
hidden_imports = [
    # Backend modules - explicitly include models
    'backend',
    'backend.models',
    'backend.app',
    'backend.utils',
    'backend.report_service',
    # SQLAlchemy
    'sqlalchemy.ext.baked',
    # Pandas internal modules
    'pandas._libs.tslibs.timedeltas',
    'pandas._libs.tslibs.np_datetime',
    'pandas._libs.tslibs.nattype',
    # Flask and dependencies
    'flask',
    'flask_cors',
    'werkzeug',
    'jinja2',
    'click',
    'itsdangerous',
    'markupsafe',
    # Standard library
    'sqlite3',
    'json',
    'threading',
    'webbrowser',
    'time',
]

# Add all discovered backend modules to hidden imports
hidden_imports.extend(backend_modules)

print(f"✓ Added {len(hidden_imports)} hidden imports")

# Verify runtime hook exists
runtime_hook_path = os.path.join(project_root, 'pyi_rth_backend.py')
if not os.path.exists(runtime_hook_path):
    print(f"ERROR: Runtime hook not found: {runtime_hook_path}")
    sys.exit(1)
print(f"✓ Found runtime hook: pyi_rth_backend.py")

# Analysis
a = Analysis(
    ['main.py'],
    pathex=[project_root, os.path.join(project_root, 'backend')],
    binaries=[],
    datas=build_files + public_files + additional_data + backend_fonts + flask_data + werkzeug_data,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[os.path.join(project_root, 'pyi_rth_backend.py')],
    excludes=[
        'matplotlib',
        'numpy.distutils',
        'tkinter',
        'PyQt5',
        'pytest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# PYZ (Python zip archive)
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# EXE
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TreeVisualizationApp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # Show console for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=os.path.join(project_root, 'public', 'favicon.ico') if os.path.exists(os.path.join(project_root, 'public', 'favicon.ico')) else None,
)

# COLLECT (bundle everything together)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='TreeVisualizationApp',
)

print("\n" + "="*80)
print("PyInstaller spec file configured successfully!")
print("Run: pyinstaller app.spec")
print("Output will be in: dist/TreeVisualizationApp/")
print("="*80 + "\n")
