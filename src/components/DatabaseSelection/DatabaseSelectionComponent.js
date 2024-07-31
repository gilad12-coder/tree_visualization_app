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
        className="cursor-pointer"
      >
        <Info size={16} className="text-blue-500" />
      </motion.div>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 p-2 bg-white rounded-md shadow-md text-sm text-gray-600 w-48 z-10"
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-black">Database Selection</h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('existing')}
            className={`flex-grow px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl ${
              activeTab === 'existing' ? 'bg-blue-500 text-white' : 'hover:bg-blue-500 hover:text-white'
            } transition-colors flex items-center justify-between`}
          >
            <span className="flex items-center">
              <Database size={20} className="mr-2" />
              <span className="font-bold">Use Existing Database</span>
            </span>
          </motion.button>
          <InfoIcon text="Select this option if you already have a database file (.db) that you want to use." />
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('new')}
            className={`flex-grow px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl ${
              activeTab === 'new' ? 'bg-blue-500 text-white' : 'hover:bg-blue-500 hover:text-white'
            } transition-colors flex items-center justify-between`}
          >
            <span className="flex items-center">
              <FolderPlus size={20} className="mr-2" />
              <span className="font-bold">Create New Database</span>
            </span>
          </motion.button>
          <InfoIcon text="Choose this option to create a new database in a specified folder." />
        </div>
      </div>
      <AnimatePresence mode="wait">
        {activeTab === 'existing' ? (
          <motion.div
            key="existing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ExistingDatabaseSection onUseExistingDB={onUseExistingDB} />
          </motion.div>
        ) : (
          <motion.div
            key="new"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <NewDatabaseSection onCreateNewDB={onCreateNewDB} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DatabaseSelectionComponent;