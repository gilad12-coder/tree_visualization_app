# -*- mode: python ; coding: utf-8 -*-

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Add the project root and backend folder to the Python path
project_root = os.path.abspath('.')
backend_folder = os.path.abspath('backend')
sys.path.append(project_root)
sys.path.append(backend_folder)

# Path to the main entry point script
main_path = 'main.py'

# Collect all necessary data files
backend_data = collect_data_files('backend')
frontend_build = [('build', 'build')]  # React build folder
public_files = [(os.path.join('public', f), os.path.join('public', f)) for f in os.listdir('public')] if os.path.exists('public') else []

# Additional data files
additional_data = []
if os.path.exists('README.md'):
    additional_data.append(('README.md', '.'))

a = Analysis(
    [main_path],
    pathex=[project_root, backend_folder],
    binaries=[],
    datas=backend_data + frontend_build + public_files + additional_data,
    hiddenimports=[
        'models', 'utils', 'report_service', 'webbrowser', 'flask', 'flask_cors', 
        'pandas', 'sqlalchemy', 'sqlite3', 'openpyxl', 'matplotlib', 'networkx',
        'fpdf', 'reportlab', 'threading', 'datetime', 'json'
    ] + collect_submodules('backend'),
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
    console=False,  # No console window for end users
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='public/favicon.ico' if os.path.exists('public/favicon.ico') else None,
)