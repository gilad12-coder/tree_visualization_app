#!/usr/bin/env python3
"""
Post-build script to create macOS .app bundle structure.
Run this after pyinstaller completes to wrap the executable in an .app bundle.
"""

import os
import shutil
import sys

def create_app_bundle():
    """Create macOS .app bundle from the built executable."""
    project_root = os.path.abspath('.')
    dist_dir = os.path.join(project_root, 'dist')
    exe_path = os.path.join(dist_dir, 'TreeVisualizationApp')
    app_bundle_path = os.path.join(dist_dir, 'TreeVisualizationApp.app')
    
    if not os.path.exists(exe_path):
        print(f"ERROR: Executable not found at {exe_path}")
        print("Please run 'pyinstaller app.spec' first")
        sys.exit(1)
    
    if os.path.exists(app_bundle_path):
        print(f"Removing existing .app bundle: {app_bundle_path}")
        shutil.rmtree(app_bundle_path)
    
    print(f"Creating .app bundle at: {app_bundle_path}")
    
    os.makedirs(os.path.join(app_bundle_path, 'Contents', 'MacOS'), exist_ok=True)
    os.makedirs(os.path.join(app_bundle_path, 'Contents', 'Resources'), exist_ok=True)
    
    shutil.copy2(exe_path, os.path.join(app_bundle_path, 'Contents', 'MacOS', 'TreeVisualizationApp'))
    os.chmod(os.path.join(app_bundle_path, 'Contents', 'MacOS', 'TreeVisualizationApp'), 0o755)
    
    icon_path = os.path.join(project_root, 'TreeVisualizationApp.icns')
    if os.path.exists(icon_path):
        shutil.copy2(icon_path, os.path.join(app_bundle_path, 'Contents', 'Resources', 'TreeVisualizationApp.icns'))
        print("✓ Icon copied to app bundle")
    else:
        print("WARNING: Icon file not found, app will use default icon")
    
    info_plist_path = os.path.join(project_root, 'Info.plist')
    if os.path.exists(info_plist_path):
        shutil.copy2(info_plist_path, os.path.join(app_bundle_path, 'Contents', 'Info.plist'))
    else:
        info_plist_content = '''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleDisplayName</key>
    <string>Tree Visualization App</string>
    <key>CFBundleExecutable</key>
    <string>TreeVisualizationApp</string>
    <key>CFBundleIconFile</key>
    <string>TreeVisualizationApp</string>
    <key>CFBundleIdentifier</key>
    <string>com.treevisualization.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>TreeVisualizationApp</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.productivity</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2024 Tree Visualization App. All rights reserved.</string>
</dict>
</plist>'''
        with open(os.path.join(app_bundle_path, 'Contents', 'Info.plist'), 'w') as f:
            f.write(info_plist_content)
    
    print(f"✓ .app bundle created successfully at: {app_bundle_path}")
    print(f"  Users can drag this to Applications folder or pin to Dock")
    print(f"  The original executable is still at: {exe_path}")

if __name__ == "__main__":
    create_app_bundle()








