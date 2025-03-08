import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Target, Filter, Users, Layers, ChevronDown, ChevronUp, 
  Upload, Settings, Command, X,
  Table, Camera, FileText, Eye, Download, Minus
} from 'react-feather';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = "http://localhost:5001";

const NavigationBar = ({
  onHome,
  onCenter,
  onFilter,
  onOrgMode,
  onToggleVacancies,
  onChangeTable,
  onExpandAll,
  onCollapseAll,
  onUpload,
  onOpenSettings,
  onOpenHelp,
  onSearch,
  onClearFilter,
  onExportExcel,
  onExportImage,
  isOrgMode,
  hideVacancies,
  hasActiveFilters,
  activeMenuId,
  setActiveMenuId,
  selectedTableId
}) => {

  const downloadReport = async (format) => {
    if (!selectedTableId) {
      toast.warning("Please select a table first");
      return;
    }

    try {
      if (format === 'pdf') {
        const response = await axios.get(
          `${API_BASE_URL}/generate_org_report_pdf/${selectedTableId}`,
          { responseType: 'blob' }
        );
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `org_report_table_${selectedTableId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success("PDF report downloaded successfully");
      } 
      else if (format === 'json') {
        const response = await axios.get(`${API_BASE_URL}/generate_org_report/${selectedTableId}`);
        
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `org_report_table_${selectedTableId}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success("JSON report downloaded successfully");
      }
      else if (format.startsWith('chart_')) {
        const chartType = format.split('_')[1];
        const response = await axios.get(
          `${API_BASE_URL}/org_report_visualization/${selectedTableId}/${chartType}`,
          { responseType: 'json' }
        );
        
        // Convert base64 to blob
        const byteString = atob(response.data.image_data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: 'image/png' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${chartType}_chart_table_${selectedTableId}.png`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success(`${chartType.replace('_', ' ')} chart downloaded successfully`);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast.error("Failed to download report");
    }
  };

  const menus = [
    {
      id: 'view',
      label: 'View',
      icon: Eye,
      items: [
        { id: 'expandAll', label: 'Expand All', icon: ChevronDown, onClick: onExpandAll },
        { id: 'collapseAll', label: 'Collapse All', icon: ChevronUp, onClick: onCollapseAll }
      ]
    },
    {
      id: 'display',
      label: 'Display',
      icon: Users,
      items: [
        { 
          id: 'orgMode', 
          label: 'Org Mode', 
          icon: Users, 
          onClick: onOrgMode,
          active: isOrgMode
        },
        { 
          id: 'hideVacancies', 
          label: 'Hide Vacant', 
          icon: Minus, 
          onClick: onToggleVacancies,
          active: hideVacancies
        }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Settings,
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, onClick: onOpenSettings },
        { id: 'shortcuts', label: 'Shortcuts', icon: Command, onClick: onOpenHelp }
      ]
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      items: [
        { id: 'exportExcel', label: 'Excel', icon: Table, onClick: onExportExcel },
        { id: 'exportImage', label: 'Tree Image', icon: Camera, onClick: onExportImage },
        { id: 'exportPdf', label: 'PDF Report', icon: FileText, onClick: () => downloadReport('pdf') }
      ]
    }
  ];

  const toggleMenu = (menuId) => {
    setActiveMenuId(activeMenuId === menuId ? null : menuId);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <nav className="h-12 px-4 flex items-center">
        <ul className="flex items-center space-x-4">
          <li>
            <button onClick={onHome} className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50" title="Home">
              <Home size={18} />
            </button>
          </li>
          <li>
            <button onClick={onCenter} className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50" title="Center View">
              <Target size={18} />
            </button>
          </li>
          <li>
            <button 
              onClick={onFilter} 
              className={`p-1.5 rounded-md hover:bg-gray-50 ${hasActiveFilters ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              title="Filter"
            >
              <Filter size={18} />
            </button>
          </li>
          {hasActiveFilters && (
            <li>
              <button onClick={onClearFilter} className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-gray-50" title="Clear Filters">
                <X size={18} />
              </button>
            </li>
          )}
        </ul>

        <div className="h-5 w-px bg-gray-200 mx-4" />

        <ul className="flex items-center space-x-4">
          <li>
            <button onClick={onChangeTable} className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50" title="Change Table">
              <Layers size={18} />
            </button>
          </li>
          <li>
            <button onClick={onUpload} className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50" title="Upload New Table">
              <Upload size={18} />
            </button>
          </li>
        </ul>

        <div className="h-5 w-px bg-gray-200 mx-4" />

        <ul className="flex items-center space-x-4">
          {menus.map((menu) => (
            <li key={menu.id} className="relative">
              <button
                onClick={() => toggleMenu(menu.id)}
                className={`p-1.5 rounded-md ${
                  activeMenuId === menu.id 
                    ? 'bg-gray-100 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
                title={menu.label}
              >
                <menu.icon size={18} />
              </button>
              <AnimatePresence>
                {activeMenuId === menu.id && (
                  <motion.div
                    className="absolute top-full mt-1 left-0 bg-white rounded shadow-md py-1 min-w-[180px] z-50 border border-gray-200"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ul className="py-1">
                      {menu.items.map((item) => (
                        <li key={item.id}>
                          <button
                            className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                              item.disabled 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : item.active
                                  ? 'text-blue-600 bg-gray-50'
                                  : 'text-gray-700 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              if (!item.disabled) {
                                item.onClick();
                                setActiveMenuId(null);
                              }
                            }}
                            disabled={item.disabled}
                          >
                            <span className={`mr-2 ${item.disabled ? 'text-gray-300' : item.active ? 'text-blue-600' : 'text-gray-500'}`}>
                              {item.icon && <item.icon size={16} />}
                            </span>
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>

        <div className="ml-auto">
          <button 
            onClick={onSearch}
            className="text-gray-500 hover:text-gray-900 p-1.5 rounded-md hover:bg-gray-50"
            title="Search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
};

export default NavigationBar;