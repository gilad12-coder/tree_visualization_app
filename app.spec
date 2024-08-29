# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Add the backend folder to the Python path
backend_folder = os.path.abspath('backend')
sys.path.append(backend_folder)

# Path to your backend's main script
backend_path = os.path.join('backend', 'app.py')

# Collect all necessary data files
backend_data = collect_data_files('backend')
frontend_build = [('build', 'build')]  # React build folder

a = Analysis(
    [backend_path],
    pathex=[backend_folder],
    binaries=[],
    datas=backend_data + frontend_build,
    hiddenimports=['models', 'utils', 'webbrowser', 'flask', 'flask_cors', 'pandas', 'sqlalchemy', 'sqlite3', 'openpyxl'] + collect_submodules('backend'), 
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='TreeVisualizationApp',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Changed from True to False
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)