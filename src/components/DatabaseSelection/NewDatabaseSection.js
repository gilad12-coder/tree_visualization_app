import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Check, Folder, AlertCircle } from 'react-feather';

const NewDatabaseSection = ({ onCreateNewDB }) => {
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 bg-blue-50 p-6 rounded-2xl shadow-lg"
    >
      <h3 className="text-2xl font-bold text-black">Create New Database</h3>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Folder className="h-5 w-5 text-blue-500" />
        </div>
        <input
          type="text"
          value={folderPath}
          onChange={handleInputChange}
          placeholder="Enter folder path for new database"
          className={`w-full pl-10 py-3 border-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            isValid ? 'border-green-500' : 'border-blue-300'
          }`}
        />
        <AnimatePresence>
          {isValid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <Check className="h-5 w-5 text-green-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: "0px 5px 10px rgba(0, 0, 0, 0.1)" }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCreate}
        disabled={!isValid}
        className={`w-full py-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
          isValid ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <FolderPlus size={20} />
        <span className="font-bold">Create New Database</span>
      </motion.button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start space-x-2 text-sm text-blue-700 bg-blue-100 p-3 rounded-lg"
      >
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <p>
          <span className="font-semibold">Tip:</span> Enter the folder path where you want to create the new database. 
          A new .db file will be automatically generated in this location.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default NewDatabaseSection;