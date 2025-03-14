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
- **📱 Responsive Design**: Enjoy a seamless experience across desktop and mobile devices
- **🔄 Real-time Updates**: Make changes to your org structure and see them reflected instantly
- **📥 Easy Data Import/Export**: Import data from Excel files and export visualizations as images or Excel spreadsheets
- **📊 Comparative Analysis**: Compare organizational structures across different time periods
- **🔔 Toast Notifications**: Receive immediate feedback for actions like downloads and settings updates
- **⚙️ Customizable Settings**: Tailor the application to your preferences with configurable settings

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

## 🛠️ Building the Executable


```bash
# Install dependencies
pip install -r requirements.txt

# Build the executable
pyinstaller app.spec
```

The executable will be created in the `dist` folder.

## 📖 Usage Guide

### First-time Users

1. Launch the application
2. Choose between creating a new database or selecting an existing one
3. Import your organizational data from an Excel file
4. Explore your organization's structure through the interactive visualization

### Returning Users

- **View Existing Charts**: Access and navigate through your previously created org charts
- **Upload New Data**: Import new organizational data to create or update charts
- **Apply Settings**: Customize your view and only apply changes when ready with the "Apply Changes" button
- **Compare Data**: Analyze changes between different time periods
- **Export Visualizations**: Download your charts as images or export data to Excel

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

## 💻 Technology Stack

### Frontend
- **React.js** - UI framework
- **Framer Motion** - Animations and transitions
- **Tailwind CSS** - Styling and responsive design
- **D3.js** - Data visualization
- **React-Toastify** - Toast notifications
- **Axios** - API requests

### Backend
- **Flask** - Web server
- **SQLAlchemy** - Database ORM
- **Pandas** - Data processing
- **ReportLab** - PDF report generation

### Packaging
- **PyInstaller** - Creating standalone executables

## 🤝 Contributing

We welcome contributions to OrgChart Visualizer! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📬 Contact

For questions, support, or feedback, please reach out to:
- Email: [your-email@example.com](mailto:your-email@example.com)
- GitHub Issues: [https://github.com/yourusername/tree_visualization_app/issues](https://github.com/yourusername/tree_visualization_app/issues)

---

<div align="center">
  
**Made with ❤️ by Your Team**

</div>