import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, CheckCircle, XCircle, AlertCircle, Folder } from 'react-feather';
import axios from 'axios';

const ExistingDatabaseSection = ({ onUseExistingDB }) => {
  const [dbPath, setDbPath] = useState('');
  const [isValid, setIsValid] = useState(null);

  const validatePath = (path) => {
    path = path.trim();
    if (path === '') return false;
    return path.toLowerCase().endsWith('.db');
  };

  const handleOpenFileExplorer = async () => {
    try {
      const response = await axios.get('http://localhost:5000/open_file_explorer');
      if (response.data.message) {
        console.log(response.data.message);
      }
    } catch (error) {
      console.error('Failed to open file explorer:', error);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setDbPath(value);
    setIsValid(validatePath(value));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid) {
      onUseExistingDB(dbPath.trim());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-3xl shadow-lg"
    >
      <h3 className="text-2xl font-bold text-black">Use Existing Database</h3>
      
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <input
            type="text"
            value={dbPath}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Enter path to existing .db file"
            className={`w-full pl-10 pr-10 py-4 border-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isValid === true ? 'border-green-500' : isValid === false ? 'border-red-500' : 'border-blue-300'
            }`}
          />
          <AnimatePresence>
            {isValid !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {isValid === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                {isValid === false && <XCircle className="h-5 w-5 text-red-500" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex space-x-4">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenFileExplorer}
            className="flex-1 py-4 px-6 bg-blue-500 text-white rounded-xl transition-all flex items-center justify-center space-x-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Folder size={20} />
            <span className="font-semibold">Open File Explorer</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onUseExistingDB(dbPath.trim())}
            disabled={!isValid}
            className={`flex-1 py-4 px-6 rounded-xl transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isValid 
                ? 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Upload size={20} />
            <span className="font-semibold">Use This Database</span>
          </motion.button>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start space-x-3 text-sm text-blue-700 bg-blue-100 p-4 rounded-xl"
      >
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <p>
          <span className="font-semibold">Tip:</span> Click 'Open File Explorer' to browse for your database file, 
          or enter the full path manually.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ExistingDatabaseSection;