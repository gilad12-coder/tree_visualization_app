import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Layout, Move, X } from 'react-feather';

// Default color for nodes
const DEFAULT_NODE_COLOR = '#F5F7FA';

// Minimal theme
const THEME = {
  primary: '#1F2937',
  primaryLight: '#1F2937',
  buttonColor: '#1F2937',
  buttonHover: '#111827'
};

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('display');
  const [previousTab, setPreviousTab] = useState(null);
  const [availableFields] = useState([
    { id: 'name', label: 'Name' },
    { id: 'role', label: 'Role' },
    { id: 'department', label: 'Department' },
    { id: 'rank', label: 'Rank' },
    { id: 'person_id', label: 'Person ID' },
    { id: 'organization_id', label: 'Organization ID' },
    { id: 'is_dead', label: 'Status' }
  ]);

  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      setPreviousTab(activeTab);
      setActiveTab(tabId);
    }
  };

  // Determine animation direction based on tab order
  const getDirection = () => {
    const tabOrder = ['display', 'colors', 'navigation'];
    const currentIndex = tabOrder.indexOf(activeTab);
    const previousIndex = tabOrder.indexOf(previousTab);
    
    if (previousIndex === -1 || currentIndex === -1) return 1;
    return currentIndex > previousIndex ? 1 : -1;
  };

  // Animation variants for screen transitions
  const contentVariants = {
    hidden: (direction) => ({
      x: direction * 20,
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: direction * -20,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  useEffect(() => {
    const updatedSettings = { ...settings };
    let hasChanges = false;

    if (!settings.primaryField) {
      updatedSettings.primaryField = 'name';
      hasChanges = true;
    }
    
    if (!settings.secondaryField) {
      updatedSettings.secondaryField = 'role';
      hasChanges = true;
    }

    if (hasChanges) {
      onSettingsChange(updatedSettings);
    }
  }, [settings, onSettingsChange]);

  const handleNodeColorChange = (color) => {
    onSettingsChange({
      ...settings,
      nodeColor: color
    });
  };

  const resetNodeColor = () => {
    onSettingsChange({
      ...settings,
      nodeColor: DEFAULT_NODE_COLOR
    });
  };

  if (!isOpen) return null;

  const direction = getDirection();

  const tabs = [
    { id: 'display', label: 'Display Settings', icon: Eye },
    { id: 'colors', label: 'Node Colors', icon: Layout },
    { id: 'navigation', label: 'Navigation', icon: Move }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-100 py-6">
            <nav className="space-y-1 px-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm rounded-md transition-colors relative ${
                    activeTab === tab.id 
                      ? 'text-gray-900 font-medium border-l-2' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    borderLeftColor: activeTab === tab.id ? THEME.primary : 'transparent'
                  }}
                >
                  <tab.icon 
                    className="mr-3 transition-colors"
                    style={{ color: activeTab === tab.id ? THEME.primary : '#9CA3AF' }}
                    size={18} 
                  />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto relative">
            <AnimatePresence mode="wait" custom={direction}>
              {activeTab === 'display' && (
                <motion.div
                  key="display"
                  custom={direction}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="h-full"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Node Display Fields</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Choose which fields appear in the organization chart nodes.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label htmlFor="primaryField" className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Field (Larger Text)
                      </label>
                      <select
                        id="primaryField"
                        value={settings.primaryField || 'name'}
                        onChange={(e) => onSettingsChange({ ...settings, primaryField: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-opacity-50 focus:ring-gray-500"
                      >
                        {availableFields.map(field => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="secondaryField" className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Field (Smaller Text)
                      </label>
                      <select
                        id="secondaryField"
                        value={settings.secondaryField || 'role'}
                        onChange={(e) => onSettingsChange({ ...settings, secondaryField: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-opacity-50 focus:ring-gray-500"
                      >
                        {availableFields.map(field => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'colors' && (
                <motion.div
                  key="colors"
                  custom={direction}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Node Color Settings</h3>
                    <motion.button 
                      onClick={resetNodeColor}
                      className="text-sm px-3 py-1 rounded text-gray-600 hover:bg-gray-100 transition-colors"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Reset to Default
                    </motion.button>
                  </div>

                  <p className="text-sm text-gray-500 mb-6">
                    Choose a color for all nodes in the organization chart.
                  </p>
                  
                  <div className="p-5 border border-gray-100 rounded-lg">
                    <div className="flex items-center space-x-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Node Background Color
                        </label>
                        <div className="flex items-center space-x-4">
                          <motion.div 
                            className="w-16 h-16 rounded-md border border-gray-300 shadow-inner flex-shrink-0" 
                            style={{ 
                              backgroundColor: settings.nodeColor || DEFAULT_NODE_COLOR,
                            }}
                            animate={{ backgroundColor: settings.nodeColor || DEFAULT_NODE_COLOR }}
                            transition={{ duration: 0.3 }}
                          />
                          
                          <div className="flex flex-col space-y-3">
                            <input
                              type="color"
                              value={settings.nodeColor || DEFAULT_NODE_COLOR}
                              onChange={(e) => handleNodeColorChange(e.target.value)}
                              className="h-9 w-14 cursor-pointer rounded border border-gray-300 flex-shrink-0"
                            />
                            
                            <input
                              type="text"
                              value={settings.nodeColor || DEFAULT_NODE_COLOR}
                              onChange={(e) => handleNodeColorChange(e.target.value)}
                              placeholder="#FFFFFF"
                              className="p-2 border border-gray-300 rounded-md text-sm w-28 font-mono flex-shrink-0"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview */}
                      <div className="flex-1 ml-10">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preview
                        </label>
                        <motion.div 
                          className="w-full h-20 rounded-xl flex items-center justify-center shadow-sm border border-gray-200"
                          style={{ 
                            backgroundColor: settings.nodeColor || DEFAULT_NODE_COLOR,
                          }}
                          animate={{ backgroundColor: settings.nodeColor || DEFAULT_NODE_COLOR }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="w-full flex flex-col items-center">
                            <span className="text-lg font-bold">Sample Name</span>
                            <span className="text-sm font-medium">Sample Role</span>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'navigation' && (
                <motion.div
                  key="navigation"
                  custom={direction}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Navigation Settings</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Adjust how the chart responds to navigation commands.
                  </p>
                  
                  <div className="space-y-6">
                    <motion.div 
                      className="border border-gray-100 p-4 rounded-lg space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <label htmlFor="moveAmount" className="block text-sm font-medium text-gray-700">
                          Move Amount Per Keystroke
                        </label>
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {settings.moveAmount}px
                        </span>
                      </div>
                      <input
                        id="moveAmount"
                        type="range"
                        min="10"
                        max="100"
                        value={settings.moveAmount}
                        onChange={(e) => onSettingsChange({ ...settings, moveAmount: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Fine (10px)</span>
                        <span>Medium (50px)</span>
                        <span>Coarse (100px)</span>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="border border-gray-100 p-4 rounded-lg space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: 0.2, duration: 0.2 }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <label htmlFor="zoomAmount" className="block text-sm font-medium text-gray-700">
                          Zoom Increment Per Keystroke
                        </label>
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {settings.zoomAmount.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        id="zoomAmount"
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={settings.zoomAmount}
                        onChange={(e) => onSettingsChange({ ...settings, zoomAmount: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Subtle (0.05x)</span>
                        <span>Medium (0.25x)</span>
                        <span>Large (0.5x)</span>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="border border-gray-100 p-4 rounded-lg space-y-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: 0.3, duration: 0.2 }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <label htmlFor="searchZoomLevel" className="block text-sm font-medium text-gray-700">
                          Search Result Zoom Level
                        </label>
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {settings.searchZoomLevel.toFixed(2)}x
                        </span>
                      </div>
                      <input
                        id="searchZoomLevel"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={settings.searchZoomLevel}
                        onChange={(e) => onSettingsChange({ ...settings, searchZoomLevel: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Zoomed Out (0.1x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Zoomed In (2.0x)</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 flex justify-center border-t border-gray-100">
          <motion.button
            onClick={onClose}
            className="px-8 py-2.5 rounded-md text-white text-sm font-medium min-w-[140px] transition-colors"
            style={{ 
              backgroundColor: THEME.buttonColor,
            }}
            whileHover={{ 
              backgroundColor: THEME.buttonHover,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.98 }}
          >
            Apply Changes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;