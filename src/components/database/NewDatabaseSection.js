import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Check, Folder, AlertCircle } from 'react-feather';
import { useTranslation } from 'react-i18next';

const NewDatabaseSection = ({ onCreateNewDB }) => {
  const { t } = useTranslation();
  const [folderPath, setFolderPath] = useState('');
  const [isValid, setIsValid] = useState(null);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setFolderPath(value);
    setIsValid(value.trim() !== '' ? true : null);
  };

  const handleCreate = () => {
    if (isValid) {
      onCreateNewDB(folderPath);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && isValid) {
      handleCreate();
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
            <Folder className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            value={folderPath}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={t('databaseSelection.enterFolderPath')}
            className={`w-full pl-10 rtl:pl-3 rtl:pr-10 py-3 border rounded-md text-gray-700 focus:outline-none focus:ring-1 transition-colors ${
              isValid ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          <AnimatePresence>
            {isValid && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3 rtl:pr-0 rtl:pl-3 flex items-center"
              >
                <Check className="h-5 w-5 text-green-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleCreate}
          disabled={!isValid}
          className={`w-full py-2.5 rounded-md transition-colors flex items-center justify-center gap-2 ${
            isValid ? 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-1 focus:ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <FolderPlus size={18} />
          <span className="font-medium">{t('landingPage.createNewDatabase')}</span>
        </motion.button>
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-start gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md"
      >
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          <span className="font-medium">{t('common.tip')}:</span> {t('databaseSelection.createDbHint')}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default NewDatabaseSection;