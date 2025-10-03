# OrgChart Visualizer

<div align="center">

![OrgChart Visualizer Logo](public/Be-net_icon.ico)

**Transform your organizational data into interactive, insightful visualizations**

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.0-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.5-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0.38-red?style=flat-square)](https://www.sqlalchemy.org/)

</div>

## 📋 Overview

OrgChart Visualizer is a powerful full-stack application designed to help organizations of all sizes visualize, analyze, and manage their organizational structures. With an intuitive interface and powerful features, it transforms complex hierarchical data into clear, interactive visualizations that provide valuable insights into your organization.

## ✨ Key Features

- **📊 Interactive Org Charts**: Drag, zoom, and explore your organization's structure with fluid, responsive visualizations
- **🔍 Advanced Search & Filtering**: Quickly find specific employees or departments with powerful search capabilities
- **📈 Timeline Analysis**: Track changes in your organization's structure over time with historical comparisons
- **🌐 Multi-Language Support**: Full internationalization with English and Hebrew support
- **↔️ RTL Layout Support**: Native right-to-left layout for Hebrew and other RTL languages
- **📱 Responsive Design**: Enjoy a seamless experience across desktop and mobile devices
- **🔄 Real-time Updates**: Make changes to your org structure and see them reflected instantly
- **📥 Easy Data Import/Export**: Import data from Excel files and export visualizations as images or Excel spreadsheets
- **📊 Comparative Analysis**: Compare organizational structures across different time periods
- **🔔 Smart Notifications**: Language-aware toast notifications with RTL-aware positioning
- **⚙️ Customizable Settings**: Tailor the application to your preferences with configurable settings and keyboard shortcuts

## 🌍 Internationalization

The application supports multiple languages with full RTL (Right-to-Left) layout support:

- **Supported Languages**: English, Hebrew (עברית)
- **RTL Layout**: Automatic layout adjustment for RTL languages
- **Font Support**: Custom Hebrew font (Rubik) for optimal readability
- **Smart Positioning**: UI elements automatically adjust position based on text direction
- **Translated UI**: 40+ translation keys covering all user-facing text

For detailed information about the internationalization setup, see [LANGUAGE_SETUP.md](LANGUAGE_SETUP.md).

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+ and npm
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tree_visualization_app.git
   cd tree_visualization_app
   ```

2. **Install backend dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Build the frontend**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   python main.py
   ```

6. **Access the application**

   Open your browser and navigate to `http://localhost:5001`

### Running as a Standalone Application

For end users, the application can be run as a standalone executable:

1. Download the latest release from the releases page
2. Extract the zip file to a location of your choice
3. Run `TreeVisualizationApp.exe` (Windows) or the application bundle (macOS)

## 🛠️ Building Standalone Executables

Build platform-specific executables for Windows and macOS with all internationalization features included.

### Prerequisites for Building

- Python 3.8+ with pip
- Node.js 14+ with npm
- PyInstaller: `pip install pyinstaller`

**Important**: PyInstaller creates platform-specific executables. Build on Windows for `.exe` and on macOS for Mac executables.

### Quick Build (Automated)

Use the automated build script that handles everything:

**Windows:**
```bash
build.bat
```

**macOS/Linux:**
```bash
./build.sh
```

The script will automatically:
1. Install all Python dependencies (including PyInstaller)
2. Install all Node.js dependencies
3. Build the React frontend with all translations
4. Create the standalone executable

### Manual Build Steps

If you prefer to build manually:

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   npm install
   ```

2. **Build React Frontend** (CRITICAL - includes all translations)
   ```bash
   npm run build
   ```

3. **Build the Executable**
   ```bash
   pyinstaller app.spec
   ```

4. **Locate the Executable**
   ```
   dist/TreeVisualizationApp/TreeVisualizationApp.exe  (Windows)
   dist/TreeVisualizationApp/TreeVisualizationApp      (macOS)
   ```

### What's Included

The standalone executable includes:
- ✅ Complete React frontend with all components
- ✅ Flask backend with all routes
- ✅ English & Hebrew translations (40+ keys)
- ✅ Full RTL layout support
- ✅ Language-aware UI (toast positioning, arrow directions)
- ✅ Automatic browser launch
- ✅ All dependencies (no installation required to run)

### Distribution

Distribute the entire `dist/TreeVisualizationApp/` folder:

```bash
# Windows
cd dist
zip -r TreeVisualizationApp-v1.0-windows.zip TreeVisualizationApp/

# macOS
tar -czf TreeVisualizationApp-v1.0-macos.tar.gz TreeVisualizationApp/
```

**File Size**: Expect ~150-200 MB (Windows) or ~100-150 MB (macOS) including Python interpreter and all dependencies.

### Troubleshooting

**Build fails with missing build/ directory**
- Solution: Run `npm run build` first

**Executable won't start**
- Solution: Check that all dependencies in `requirements.txt` are installed

**Browser doesn't open automatically**
- Solution: Manually navigate to `http://localhost:5001`

**Hebrew text not displaying**
- Solution: Rubik font loads from Google Fonts - check internet connection

## 📖 Usage Guide

### First-time Users

1. Launch the application
2. Choose between creating a new database or selecting an existing one
3. Import your organizational data from an Excel file
4. Explore your organization's structure through the interactive visualization
5. Switch languages from the settings menu (⚙️ icon)

### Returning Users

- **View Existing Charts**: Access and navigate through your previously created org charts
- **Upload New Data**: Import new organizational data to create or update charts
- **Apply Settings**: Customize your view including language preferences
- **Compare Data**: Analyze changes between different time periods
- **Export Visualizations**: Download your charts as images or export data to Excel

### Keyboard Shortcuts

- **Cmd/Ctrl + F**: Open search bar
- **Cmd/Ctrl + H**: Toggle help modal
- **Cmd/Ctrl + T**: Open table selection
- **Cmd/Ctrl + U**: Open file upload modal
- **Cmd/Ctrl + ,**: Open settings
- And many more! (See settings for full list)

## 🔧 Advanced Features

### Timeline Analysis

Track changes in your organization over time:
- View historical data points
- Analyze employee movement and promotions
- Identify structural changes

### Comparative Reports

Generate comprehensive reports comparing organizational structures:
- Department size changes
- Reporting structure modifications
- Role distribution analysis

### Search and Filtering

Find specific information quickly:
- Search by name, role, department, or any custom field
- Filter by various attributes
- Highlight specific nodes or branches
- Navigate search results with prev/next buttons

### Language & RTL Support

Seamlessly switch between languages:
- Full UI translation
- Automatic layout mirroring for RTL languages
- Language-specific fonts and styling
- Smart toast notification positioning

## 💻 Technology Stack

### Frontend
- **React.js** - UI framework
- **i18next / react-i18next** - Internationalization
- **Framer Motion** - Animations and transitions
- **Tailwind CSS** - Styling and responsive design with RTL support
- **D3.js** - Data visualization
- **React-Toastify** - Toast notifications
- **Axios** - API requests
- **Lucide React & React Feather** - Icon libraries

### Backend
- **Flask** - Web server
- **SQLAlchemy** - Database ORM
- **Pandas** - Data processing
- **ReportLab** - PDF report generation

### Packaging
- **PyInstaller** - Creating standalone executables

## 🎨 Design Features

- **Custom Hebrew Font**: Rubik font for optimal Hebrew text rendering
- **RTL-Aware Layout**: All margins, paddings, and positioning automatically flip for RTL languages
- **Arrow Reversal**: Navigation arrows (←/→) reverse direction in RTL mode
- **Smart Toast Positioning**: Bottom-left for Hebrew, bottom-right for English
- **Responsive Icons**: Icon positioning adapts to text direction

## 🤝 Contributing

We welcome contributions to OrgChart Visualizer! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Adding New Languages

To add support for a new language:

1. Create a new translation file in `src/i18n/locales/[language-code].json`
2. Add the language to `src/i18n/config.js`
3. If the language is RTL, add RTL support in relevant components
4. Update the language selector in `SettingsModal.js`

See [LANGUAGE_SETUP.md](LANGUAGE_SETUP.md) for detailed instructions.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Contact

For questions, support, or feedback, please reach out to:
- Email: [your-email@example.com](mailto:your-email@example.com)
- GitHub Issues: [https://github.com/yourusername/tree_visualization_app/issues](https://github.com/yourusername/tree_visualization_app/issues)

## 🙏 Acknowledgments

- Built with support from Claude Code by Anthropic
- Hebrew font: Rubik by Google Fonts
- Icons: Lucide and React Feather

---

<div align="center">

**Made with ❤️ for organizations worldwide**

</div>
