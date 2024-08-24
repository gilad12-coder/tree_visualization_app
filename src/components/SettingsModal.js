import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'react-feather';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg p-6 w-96">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="moveAmount" className="block mb-2">
              Move Amount: {settings.moveAmount}
            </label>
            <input
              id="moveAmount"
              type="range"
              min="10"
              max="100"
              value={settings.moveAmount}
              onChange={(e) => onSettingsChange({ ...settings, moveAmount: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="zoomAmount" className="block mb-2">
              Zoom Amount: {settings.zoomAmount.toFixed(2)}
            </label>
            <input
              id="zoomAmount"
              type="range"
              min="0.05"
              max="0.5"
              step="0.01"
              value={settings.zoomAmount}
              onChange={(e) => onSettingsChange({ ...settings, zoomAmount: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="searchZoomLevel" className="block mb-2">
              Search Result Zoom Level: {settings.searchZoomLevel.toFixed(2)}
            </label>
            <input
              id="searchZoomLevel"
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={settings.searchZoomLevel}
              onChange={(e) => onSettingsChange({ ...settings, searchZoomLevel: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsModal;