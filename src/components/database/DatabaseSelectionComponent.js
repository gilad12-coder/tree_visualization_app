import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FolderPlus, Info } from 'react-feather';
import ExistingDatabaseSection from './ExistingDatabaseSection';
import NewDatabaseSection from './NewDatabaseSection';

const InfoIcon = ({ text }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative inline-block">
      <motion.div
        onHoverStart={() => setShowInfo(true)}
        onHoverEnd={() => setShowInfo(false)}
        className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Info size={16} />
      </motion.div>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute left-0 transform -translate-x-1/4 bottom-full mb-2 p-2 bg-white rounded-md shadow-md text-xs text-gray-600 w-48 z-10 border border-gray-200"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DatabaseSelectionComponent = ({ onUseExistingDB, onCreateNewDB }) => {
  const [activeTab, setActiveTab] = useState('existing');

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 overflow-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Select Database</h2>
          
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('existing')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'existing' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } transition-colors`}
            >
              <Database size={16} />
              <span>Use Existing Database</span>
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'new' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } transition-colors`}
            >
              <FolderPlus size={16} />
              <span>Create New Database</span>
            </motion.button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <InfoIcon 
              text={
                activeTab === 'existing' 
                  ? "Select this option if you already have a database file (.db) that you want to use." 
                  : "Choose this option to create a new database in a specified folder."
              } 
            />
            <span>
              {activeTab === 'existing' 
                ? "Use an existing .db file to continue working with your data." 
                : "Create a new empty database file in your chosen location."}
            </span>
          </div>
          
          <AnimatePresence mode="wait">
            {activeTab === 'existing' ? (
              <motion.div
                key="existing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ExistingDatabaseSection onUseExistingDB={onUseExistingDB} />
              </motion.div>
            ) : (
              <motion.div
                key="new"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <NewDatabaseSection onCreateNewDB={onCreateNewDB} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DatabaseSelectionComponent;