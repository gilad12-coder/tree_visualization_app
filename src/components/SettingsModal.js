import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Layout, Move } from 'react-feather';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('display');
  const [previousTab, setPreviousTab] = useState(null);
  // Only include fields that exist in the DataEntry model from the backend
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

  // Animation variants
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

  // Tab indicator animation
  const tabIndicatorVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 500, 
        damping: 30 
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.2 }
    }
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

  const handleColorChange = (level, color) => {
    const updatedColors = { 
      ...(settings.nodeColors || {}), 
      [level]: color 
    };
    
    onSettingsChange({
      ...settings,
      nodeColors: updatedColors
    });
  };

  const resetColors = () => {
    // Reset to the original defaults by clearing overrides
    onSettingsChange({
      ...settings,
      nodeColors: {}
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-white rounded-lg shadow-md w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-100 py-6">
            <nav className="space-y-1 px-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm rounded-md transition-all duration-300 relative ${
                    activeTab === tab.id 
                      ? 'text-[#4263EB] bg-blue-50 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon 
                    className={`mr-3 transition-all duration-300 ${activeTab === tab.id ? 'text-[#4263EB]' : 'text-gray-400'}`} 
                    size={18} 
                  />
                  <span className="transition-all duration-300">{tab.label}</span>
                  <AnimatePresence>
                    {activeTab === tab.id && (
                      <motion.div 
                        className="ml-auto w-1 h-5 bg-[#4263EB] rounded-full"
                        variants={tabIndicatorVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      />
                    )}
                  </AnimatePresence>
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
                        className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-[#4263EB] focus:border-[#4263EB]"
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
                        className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-[#4263EB] focus:border-[#4263EB]"
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
                      onClick={resetColors}
                      className="text-sm text-[#4263EB] hover:text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Reset to Defaults
                    </motion.button>
                  </div>

                  <p className="text-sm text-gray-500 mb-6">
                    Customize the colors for each level of the organization chart.
                  </p>
                  
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(level => {
                      const levelKey = `level${level}`;
                      const currentColor = settings.nodeColors?.[levelKey] || '';
                      
                      return (
                        <motion.div 
                          key={level} 
                          className="flex items-center p-3 border border-gray-100 rounded-lg"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            transition: { 
                              delay: level * 0.05,
                              duration: 0.2
                            }
                          }}
                        >
                          <div className="w-36">
                            <div className="text-sm font-medium text-gray-800">Level {level}</div>
                            <div className="text-xs text-gray-500">
                              {level === 1 ? 'Top level' : `Subordinate ${level - 1}`}
                            </div>
                          </div>
                          
                          <div className="flex-1 flex items-center space-x-3">
                            <motion.div 
                              className="w-12 h-12 rounded-md border border-gray-300 shadow-inner flex-shrink-0" 
                              style={{ 
                                backgroundColor: currentColor,
                              }}
                              animate={{ backgroundColor: currentColor }}
                              transition={{ duration: 0.3 }}
                            />
                            
                            <input
                              type="color"
                              value={currentColor || "#FFFFFF"}
                              onChange={(e) => handleColorChange(levelKey, e.target.value)}
                              className="h-9 w-14 cursor-pointer rounded border border-gray-300 flex-shrink-0"
                            />
                            
                            <input
                              type="text"
                              value={currentColor || ""}
                              onChange={(e) => handleColorChange(levelKey, e.target.value)}
                              className="p-2 border border-gray-300 rounded-md text-sm w-28 font-mono flex-shrink-0"
                            />
                            
                            {/* Preview */}
                            <div className="ml-4 flex-1">
                              <motion.div 
                                className="w-full h-12 rounded-md flex items-center justify-center shadow-sm"
                                style={{ 
                                  backgroundColor: currentColor,
                                  border: '1px solid rgba(0,0,0,0.1)'
                                }}
                                animate={{ backgroundColor: currentColor }}
                                transition={{ duration: 0.3 }}
                              >
                                <span className="text-sm font-medium">Preview</span>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
            className="px-8 py-2.5 bg-[#5F738C] text-white rounded-md hover:bg-[#4A5D75] transition-colors shadow-sm text-sm font-medium min-w-[140px]"
            whileHover={{ scale: 1.03, backgroundColor: "#4A5D75" }}
            whileTap={{ scale: 0.97 }}
          >
            Apply Changes
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;