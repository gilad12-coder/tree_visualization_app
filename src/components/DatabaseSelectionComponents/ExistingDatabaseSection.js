import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, CheckCircle, XCircle, AlertCircle, Folder } from 'react-feather';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ExistingDatabaseSection = ({ onUseExistingDB }) => {
  const { t } = useTranslation();
  const [dbPath, setDbPath] = useState('');
  const [isValid, setIsValid] = useState(null);

  const validatePath = (path) => {
    path = path.trim();
    if (path === '') return false;
    return path.toLowerCase().endsWith('.db');
  };

  const handleOpenFileExplorer = async () => {
    try {
      const response = await axios.get('http://localhost:5001/open_file_explorer');
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 bg-white rounded-lg shadow-md p-6 border border-gray-200"
    >
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none">
            <Database className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            value={dbPath}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={t('databaseSelection.enterDbPath')}
            className={`w-full pl-10 pr-10 rtl:pr-10 rtl:pl-10 py-3 border rounded-md text-gray-700 focus:outline-none focus:ring-1 transition-colors ${
              isValid === true ? 'border-green-500 focus:ring-green-500' :
              isValid === false ? 'border-red-500 focus:ring-red-500' :
              'border-gray-300 focus:ring-gray-400'
            }`}
          />
          <AnimatePresence>
            {isValid !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center"
              >
                {isValid === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                {isValid === false && <XCircle className="h-5 w-5 text-red-500" />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenFileExplorer}
            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-md transition-colors flex items-center justify-center gap-2 hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <Folder size={18} />
            <span className="font-medium">{t('databaseSelection.browseFiles')}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onUseExistingDB(dbPath.trim())}
            disabled={!isValid}
            className={`flex-1 py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 focus:outline-none ${
              isValid
                ? 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-1 focus:ring-gray-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Upload size={18} />
            <span className="font-medium">{t('databaseSelection.useDatabase')}</span>
          </motion.button>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md"
      >
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          <span className="font-medium">{t('common.tip')}:</span> {t('databaseSelection.browseFilesHint')}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default ExistingDatabaseSection;