import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Layout, Move, X, RotateCcw, Command } from 'react-feather';
import { ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';

// Import default settings from the centralized file
import {
  DEFAULT_NODE_COLOR,
  DEFAULT_PRIMARY_FIELD,
  DEFAULT_SECONDARY_FIELD,
  DEFAULT_MOVE_AMOUNT,
  DEFAULT_ZOOM_AMOUNT,
  DEFAULT_SEARCH_ZOOM_LEVEL,
  DEFAULT_KEYBINDINGS,
  THEME
} from './DefaultSettings';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState('display');
  const [localSettings, setLocalSettings] = useState({ ...settings });
  
  // Save settings to localStorage when they change
  const saveSettingsToStorage = (updatedSettings) => {
    try {
      localStorage.setItem('orgChartSettings', JSON.stringify(updatedSettings));
      console.log('Settings saved to localStorage from SettingsModal');
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  };
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
      setActiveTab(tabId);
    }
  };

  // Initialize local settings when the modal opens or settings change
  useEffect(() => {
    const updatedSettings = { ...settings };
    
    // Set defaults if needed
    if (!updatedSettings.primaryField) {
      updatedSettings.primaryField = DEFAULT_PRIMARY_FIELD;
    }
    
    if (!updatedSettings.secondaryField) {
      updatedSettings.secondaryField = DEFAULT_SECONDARY_FIELD;
    }
    
    // Initialize default keybindings if they don't exist
    if (!updatedSettings.keybindings) {
      updatedSettings.keybindings = { ...DEFAULT_KEYBINDINGS };
    } else {
      // Process existing keybindings to ensure they're in single letter format
      const processedKeybindings = {};
      
      Object.keys(updatedSettings.keybindings).forEach(action => {
        const binding = updatedSettings.keybindings[action];
        // Extract just the letter part if it's in CTRL+Letter format
        if (binding && binding.startsWith('CTRL+') && binding.length > 5) {
          processedKeybindings[action] = binding.split('+')[1];
        } else {
          processedKeybindings[action] = extractKeyFromBinding(binding) || DEFAULT_KEYBINDINGS[action] || '';
        }
      });
      
      // Add any missing default keybindings
      Object.keys(DEFAULT_KEYBINDINGS).forEach(action => {
        if (!processedKeybindings[action]) {
          processedKeybindings[action] = DEFAULT_KEYBINDINGS[action];
        }
      });
      
      updatedSettings.keybindings = processedKeybindings;
    }

    // Initialize default navigation settings if they don't exist
    if (!updatedSettings.moveAmount) {
      updatedSettings.moveAmount = DEFAULT_MOVE_AMOUNT;
    }

    if (!updatedSettings.zoomAmount) {
      updatedSettings.zoomAmount = DEFAULT_ZOOM_AMOUNT;
    }

    if (!updatedSettings.searchZoomLevel) {
      updatedSettings.searchZoomLevel = DEFAULT_SEARCH_ZOOM_LEVEL;
    }

    setLocalSettings(updatedSettings);
  }, [settings, isOpen]);

  const handleNodeColorChange = (color) => {
    setLocalSettings({
      ...localSettings,
      nodeColor: color
    });
  };

  // Reset functions for each tab
  const resetDisplaySettings = () => {
    setLocalSettings({
      ...localSettings,
      primaryField: DEFAULT_PRIMARY_FIELD,
      secondaryField: DEFAULT_SECONDARY_FIELD
    });
    toast.info("Display settings reset to defaults");
  };

  const resetNodeColor = () => {
    setLocalSettings({
      ...localSettings,
      nodeColor: DEFAULT_NODE_COLOR
    });
    toast.info("Node color reset to default");
  };

  const resetNavigationSettings = () => {
    setLocalSettings({
      ...localSettings,
      moveAmount: DEFAULT_MOVE_AMOUNT,
      zoomAmount: DEFAULT_ZOOM_AMOUNT,
      searchZoomLevel: DEFAULT_SEARCH_ZOOM_LEVEL
    });
    toast.info("Navigation settings reset to defaults");
  };

  const resetKeyboardSettings = () => {
    setLocalSettings({
      ...localSettings,
      keybindings: { ...DEFAULT_KEYBINDINGS }
    });
    toast.info("Keyboard shortcuts reset to defaults");
  };
  
  // Helper function to check if a key is a valid letter
  const isValidKey = (key) => {
    return /^[A-Za-z]$/.test(key);
  };
  
  // Helper function to extract the letter from CTRL+LETTER format
  const extractKeyFromBinding = (binding) => {
    if (!binding) return '';
    
    const parts = binding.split('+');
    if (parts.length === 2 && parts[0] === 'CTRL' && parts[1].length === 1) {
      return parts[1];
    }
    return binding; // Return the binding itself if it's not in CTRL+X format
  };
  
  // Handle keybinding change
  const handleKeybindingChange = (actionId, inputValue) => {
    // Take only the first character if multiple are entered
    let key = inputValue.length > 0 ? inputValue[0] : '';
    
    // Capitalize the key
    key = key.toUpperCase();
    
    // Check if this key is already used for another action
    if (key) {
      const duplicateAction = Object.entries(localSettings.keybindings || {}).find(
        ([existingAction, existingKey]) => existingKey === key && existingAction !== actionId
      );
      
      if (duplicateAction) {
        // Show a warning toast but still allow the change (will be fixed on apply)
        toast.warning(`Warning: '${key}' is already used for '${duplicateAction[0]}'. This will be reset when you apply changes.`);
      }
      
      // Check if the key is valid
      if (!isValidKey(key)) {
        toast.warning(`Invalid key: '${key}'. Only letters A-Z are allowed.`);
      }
    }
    
    const newKeybindings = {
      ...(localSettings.keybindings || {}),
    };
    
    // Always update the binding (valid or not)
    // Store just the letter, not the CTRL+ format
    newKeybindings[actionId] = key;
    
    setLocalSettings({
      ...localSettings,
      keybindings: newKeybindings
    });
  };
  
  const applyChanges = () => {
    // Ensure keybindings are properly formatted before applying
    const formattedSettings = { ...localSettings };
    
    // Make sure keybindings exist
    if (!formattedSettings.keybindings) {
      formattedSettings.keybindings = { ...DEFAULT_KEYBINDINGS };
    }
    
    // First pass: Check for duplicates and invalid keys
    const keyUsage = {}; // Track which keys are used and by which actions
    let hasDuplicates = false;
    let hasInvalidKeys = false;
    
    // Find all duplicates and invalid keys
    Object.entries(formattedSettings.keybindings).forEach(([action, key]) => {
      if (!isValidKey(key)) {
        hasInvalidKeys = true;
        return;
      }
      
      if (!keyUsage[key]) {
        keyUsage[key] = [action];
      } else {
        keyUsage[key].push(action);
        hasDuplicates = true;
      }
    });
    
    // If there are duplicates or invalid keys, block the apply action
    if (hasDuplicates || hasInvalidKeys) {
      if (hasDuplicates) {
        // Show which keys are duplicated and which actions use them
        const duplicateMessages = Object.entries(keyUsage)
          .filter(([_, actions]) => actions.length > 1)
          .map(([key, actions]) => {
            return `Key '${key}' is used by multiple actions: ${actions.join(', ')}`;
          });
        
        toast.error(`Cannot apply settings with duplicate keybindings:\n${duplicateMessages.join('\n')}`);
      }
      
      if (hasInvalidKeys) {
        const invalidKeys = Object.entries(formattedSettings.keybindings)
          .filter(([_, key]) => !isValidKey(key))
          .map(([action, key]) => `'${key}' for '${action}'`);
        
        toast.error(`Cannot apply settings with invalid keys: ${invalidKeys.join(', ')}`);
      }
      
      // Return early without applying changes
      return;
    }
    
    // If we get here, all keys are valid and there are no duplicates
    // Format the keybindings with CTRL+ prefix
    const processedKeybindings = {};
    Object.entries(formattedSettings.keybindings).forEach(([action, key]) => {
      processedKeybindings[action] = `CTRL+${key}`;
    });
    
    formattedSettings.keybindings = processedKeybindings;
    
    // Save to localStorage first
    saveSettingsToStorage(formattedSettings);
    
    // Then update the parent component
    onSettingsChange(formattedSettings);
    
    // Show success message
    toast.success("Settings updated successfully");
    
    onClose();
  };

  // Reset button component for consistency across tabs
  const ResetButton = ({ onClick, label = "Reset to Defaults" }) => (
    <button
      onClick={onClick}
      className="flex items-center text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 
        transition-colors border border-gray-200 shadow-sm hover:shadow"
    >
      <RotateCcw size={14} className="mr-2" />
      {label}
    </button>
  );

  if (!isOpen) return null;

  const tabs = [
    { id: 'display', label: 'Display Settings', icon: Eye },
    { id: 'colors', label: 'Node Colors', icon: Layout },
    { id: 'navigation', label: 'Navigation', icon: Move },
    { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Command }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div className="flex-1"></div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex h-full overflow-hidden">
          {/* Sidebar with improved visual design */}
          <div className="w-64 border-r border-gray-100 bg-gray-50 py-6">
            <nav className="space-y-1 px-3">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-all relative ${
                    activeTab === tab.id 
                      ? 'text-gray-900 font-medium bg-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon 
                    className="mr-3 transition-colors"
                    style={{ color: activeTab === tab.id ? THEME.accent : '#9CA3AF' }}
                    size={18} 
                  />
                  <span>{tab.label}</span>
                  
                  {activeTab === tab.id && (
                    <div className="absolute right-3">
                      <ArrowRight size={16} className="text-gray-400" />
                    </div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content with improved visual hierarchy */}
          <div className="flex-1 p-8 overflow-y-auto relative bg-white">
            {activeTab === 'display' && (
              <div className="h-full">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Node Display Fields</h3>
                  <ResetButton onClick={resetDisplaySettings} />
                </div>
                
                <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
                  <div className="flex flex-row gap-8">
                    {/* Left side - Field settings with improved controls */}
                    <div className="flex-1 space-y-6">
                      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <label htmlFor="primaryField" className="block text-sm font-medium text-gray-700">
                            Primary Field
                          </label>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Larger Text
                          </span>
                        </div>
                        <select
                          id="primaryField"
                          value={localSettings.primaryField || DEFAULT_PRIMARY_FIELD}
                          onChange={(e) => setLocalSettings({ ...localSettings, primaryField: e.target.value })}
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          style={{ 
                            backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                            backgroundPosition: "right 0.5rem center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "1.5em 1.5em",
                            paddingRight: "2.5rem"
                          }}
                        >
                          {availableFields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <label htmlFor="secondaryField" className="block text-sm font-medium text-gray-700">
                            Secondary Field
                          </label>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Smaller Text
                          </span>
                        </div>
                        <select
                          id="secondaryField"
                          value={localSettings.secondaryField || DEFAULT_SECONDARY_FIELD}
                          onChange={(e) => setLocalSettings({ ...localSettings, secondaryField: e.target.value })}
                          className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                          style={{ 
                            backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
                            backgroundPosition: "right 0.5rem center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "1.5em 1.5em",
                            paddingRight: "2.5rem"
                          }}
                        >
                          {availableFields.map(field => (
                            <option key={field.id} value={field.id}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Right side - Enhanced Preview */}
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Preview</h4>
                      <div className="relative">
                        <div 
                          className="w-full h-40 py-4 px-6 rounded-xl flex items-center justify-center shadow-md border border-gray-200"
                          style={{ 
                            backgroundColor: localSettings.nodeColor || DEFAULT_NODE_COLOR
                          }}
                        >
                          <div 
                            className="w-56 h-28 rounded-lg border border-gray-200/50 shadow-sm flex flex-col justify-between p-4"
                            style={{ 
                              backgroundColor: localSettings.nodeColor || DEFAULT_NODE_COLOR, 
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                            }}
                          >
                            <div className="flex items-start">
                              <span className="text-lg font-bold text-left">
                                {availableFields.find(f => f.id === (localSettings.primaryField || DEFAULT_PRIMARY_FIELD))?.label || 'Name'}
                              </span>
                            </div>
                            <div className="flex justify-end mt-2">
                              <span className="text-sm font-medium text-gray-600">
                                {availableFields.find(f => f.id === (localSettings.secondaryField || DEFAULT_SECONDARY_FIELD))?.label || 'Role'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                          <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 shadow-sm">
                            Example Node
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Node Color Settings</h3>
                  <ResetButton onClick={resetNodeColor} />
                </div>
                
                <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 shadow-sm">
                  <div className="flex items-center space-x-8">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Node Background Color
                      </label>
                      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center space-x-5">
                          <div 
                            className="w-16 h-16 rounded-lg border border-gray-300 shadow-md flex-shrink-0" 
                            style={{ 
                              backgroundColor: localSettings.nodeColor || DEFAULT_NODE_COLOR,
                            }}
                          />
                          
                          <div className="flex flex-col space-y-3">
                            <div className="relative">
                              <input
                                type="color"
                                value={localSettings.nodeColor || DEFAULT_NODE_COLOR}
                                onChange={(e) => handleNodeColorChange(e.target.value)}
                                className="h-9 w-16 cursor-pointer rounded-md border border-gray-300 flex-shrink-0"
                              />
                              <span className="ml-2 text-xs text-gray-500">Color Picker</span>
                            </div>
                            
                            <div className="relative">
                              <input
                                type="text"
                                value={localSettings.nodeColor || DEFAULT_NODE_COLOR}
                                onChange={(e) => handleNodeColorChange(e.target.value)}
                                placeholder="#FFFFFF"
                                className="p-2 border border-gray-300 rounded-md text-sm w-28 font-mono flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <span className="ml-2 text-xs text-gray-500">Hex Value</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Preview */}
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Preview
                      </label>
                      <div className="relative overflow-hidden rounded-lg shadow-md border border-gray-200 h-36 bg-white">
                        <div className="absolute inset-0 bg-gray-100 bg-opacity-50" style={{ 
                          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)",
                          backgroundSize: "20px 20px"
                        }}></div>
                        
                        <div className="flex items-center justify-center h-full">
                          <div 
                            className="w-56 h-28 rounded-lg shadow-md flex flex-col justify-between p-4 relative z-10 hover:shadow-lg transition-shadow"
                            style={{ 
                              backgroundColor: localSettings.nodeColor || DEFAULT_NODE_COLOR,
                            }}
                          >
                            <div className="flex items-start">
                              <span className="text-lg font-bold text-left">Sample Name</span>
                            </div>
                            <div className="flex justify-end mt-2">
                              <span className="text-sm font-medium text-gray-600">Sample Role</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'navigation' && (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Navigation Settings</h3>
                    <ResetButton onClick={resetNavigationSettings} />
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <label htmlFor="moveAmount" className="block text-sm font-medium text-gray-700">
                        Move Amount Per Keystroke
                      </label>
                      <span className="text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-1 rounded-full">
                        {localSettings.moveAmount}px
                      </span>
                    </div>
                    <div className="px-2">
                      <input
                        id="moveAmount"
                        type="range"
                        min="10"
                        max="100"
                        value={localSettings.moveAmount}
                        onChange={(e) => setLocalSettings({ ...localSettings, moveAmount: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                        <span>Fine (10px)</span>
                        <span>Medium (50px)</span>
                        <span>Coarse (100px)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <label htmlFor="zoomAmount" className="block text-sm font-medium text-gray-700">
                        Zoom Increment Per Keystroke
                      </label>
                      <span className="text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-1 rounded-full">
                        {localSettings.zoomAmount.toFixed(2)}x
                      </span>
                    </div>
                    <div className="px-2">
                      <input
                        id="zoomAmount"
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={localSettings.zoomAmount}
                        onChange={(e) => setLocalSettings({ ...localSettings, zoomAmount: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                        <span>Subtle (0.05x)</span>
                        <span>Medium (0.25x)</span>
                        <span>Large (0.5x)</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                      <label htmlFor="searchZoomLevel" className="block text-sm font-medium text-gray-700">
                        Search Result Zoom Level
                      </label>
                      <span className="text-sm font-medium text-white bg-gradient-to-r from-gray-700 to-gray-800 px-3 py-1 rounded-full">
                        {localSettings.searchZoomLevel.toFixed(2)}x
                      </span>
                    </div>
                    <div className="px-2">
                      <input
                        id="searchZoomLevel"
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.05"
                        value={localSettings.searchZoomLevel}
                        onChange={(e) => setLocalSettings({ ...localSettings, searchZoomLevel: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: THEME.buttonColor }}
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                        <span>Zoomed Out (0.1x)</span>
                        <span>Normal (1.0x)</span>
                        <span>Zoomed In (2.0x)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keyboard' && (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Keyboard Shortcuts</h3>
                    <ResetButton onClick={resetKeyboardSettings} />
                  </div>
                </div>
                
                <div className="space-y-5">
                  {/* General Shortcuts */}
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">General Shortcuts</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'toggleHelp', label: 'Toggle Settings Modal', defaultKey: 'H' },
                        { id: 'changeTable', label: 'Change Table', defaultKey: 'G' },
                        { id: 'uploadTable', label: 'Upload New Table', defaultKey: 'U' }
                      ].map(shortcut => (
                        <div key={shortcut.id} className="flex items-center justify-between">
                          <label htmlFor={`key-${shortcut.id}`} className="text-sm text-gray-600">
                            {shortcut.label}
                          </label>
                          <div className="flex items-center">
                            <div className="mr-2 text-sm font-medium text-gray-500">CTRL +</div>
                            <input
                              id={`key-${shortcut.id}`}
                              type="text"
                              value={localSettings.keybindings?.[shortcut.id] || ''}
                              onChange={(e) => handleKeybindingChange(shortcut.id, e.target.value)}
                              className={`w-10 p-2 border rounded-md text-sm font-mono text-center uppercase ${
                                isValidKey(localSettings.keybindings?.[shortcut.id]) 
                                  ? 'border-gray-300 bg-white' 
                                  : 'border-red-300 bg-red-50'
                              }`}
                              maxLength={1}
                              placeholder={extractKeyFromBinding(DEFAULT_KEYBINDINGS[shortcut.id])}
                            />
                            {!isValidKey(localSettings.keybindings?.[shortcut.id]) && localSettings.keybindings?.[shortcut.id] && (
                              <span className="ml-2 text-xs text-red-500">Invalid</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Navigation Shortcuts */}
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Navigation Shortcuts</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'centerChart', label: 'Center Chart', defaultKey: 'C' }
                      ].map(shortcut => (
                        <div key={shortcut.id} className="flex items-center justify-between">
                          <label htmlFor={`key-${shortcut.id}`} className="text-sm text-gray-600">
                            {shortcut.label}
                          </label>
                          <div className="flex items-center">
                            <div className="mr-2 text-sm font-medium text-gray-500">CTRL +</div>
                            <input
                              id={`key-${shortcut.id}`}
                              type="text"
                              value={extractKeyFromBinding(localSettings.keybindings?.[shortcut.id])}
                              onChange={(e) => handleKeybindingChange(shortcut.id, e.target.value)}
                              className={`w-10 p-2 border rounded-md text-sm font-mono text-center uppercase ${
                                isValidKey(localSettings.keybindings?.[shortcut.id]) 
                                  ? 'border-gray-300 bg-white' 
                                  : 'border-red-300 bg-red-50'
                              }`}
                              maxLength={1}
                              placeholder={extractKeyFromBinding(DEFAULT_KEYBINDINGS[shortcut.id])}
                            />
                            {!isValidKey(localSettings.keybindings?.[shortcut.id]) && (
                              <span className="ml-2 text-xs text-red-500">Invalid</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Node Interaction Shortcuts */}
                  <div className="border border-gray-200 p-5 rounded-xl bg-white shadow-sm overflow-hidden">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Node Interaction Shortcuts</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'filterNodes', label: 'Filter Nodes', defaultKey: 'S' },
                        { id: 'removeFilter', label: 'Remove Search Filter', defaultKey: 'R' },
                        { id: 'toggleOrgMode', label: 'Toggle Org Mode', defaultKey: 'O' },
                        { id: 'toggleSearchbar', label: 'Toggle Searchbar', defaultKey: 'F' },
                        { id: 'expandAllNodes', label: 'Expand All Nodes', defaultKey: 'E' },
                        { id: 'collapseAllNodes', label: 'Collapse All Nodes', defaultKey: 'Q' }
                      ].map(shortcut => (
                        <div key={shortcut.id} className="flex items-center justify-between">
                          <label htmlFor={`key-${shortcut.id}`} className="text-sm text-gray-600">
                            {shortcut.label}
                          </label>
                          <div className="flex items-center">
                            <div className="mr-2 text-sm font-medium text-gray-500">CTRL +</div>
                            <input
                              id={`key-${shortcut.id}`}
                              type="text"
                              value={extractKeyFromBinding(localSettings.keybindings?.[shortcut.id])}
                              onChange={(e) => handleKeybindingChange(shortcut.id, e.target.value)}
                              className={`w-10 p-2 border rounded-md text-sm font-mono text-center uppercase ${
                                isValidKey(localSettings.keybindings?.[shortcut.id]) 
                                  ? 'border-gray-300 bg-white' 
                                  : 'border-red-300 bg-red-50'
                              }`}
                              maxLength={1}
                              placeholder={extractKeyFromBinding(DEFAULT_KEYBINDINGS[shortcut.id])}
                            />
                            {!isValidKey(localSettings.keybindings?.[shortcut.id]) && (
                              <span className="ml-2 text-xs text-red-500">Invalid</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with button styled like UpdatePersonalInfoSection */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={applyChanges}
              className="w-full flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors shadow-sm hover:shadow-md"
              style={{ 
                backgroundColor: THEME.buttonColor,
                boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
              }}
            >
              <span>Apply Changes</span>
              <ArrowRight size={18} className="ml-2" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;