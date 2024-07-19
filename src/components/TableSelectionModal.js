// src/components/TableSelectionModal.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Folder, File, ChevronRight, ChevronLeft } from 'react-feather';

const TableSelectionModal = ({ isOpen, onClose, onSelectTable, folderStructure }) => {
  const [currentPath, setCurrentPath] = useState([]);

  const getCurrentFolder = () => {
    let current = { subfolders: folderStructure, tables: [] };
    for (let folderId of currentPath) {
      current = current.subfolders.find(f => f.id === folderId);
    }
    return current;
  };

  const handleFolderClick = (folder) => {
    setCurrentPath([...currentPath, folder.id]);
  };

  const handleBackClick = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const currentFolder = getCurrentFolder();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Select Table</h2>
                <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center">
                <button
                  onClick={handleBackClick}
                  disabled={currentPath.length === 0}
                  className={`mr-2 ${currentPath.length === 0 ? 'text-gray-400' : 'text-blue-500 hover:text-blue-600'}`}
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-gray-600">
                  {currentPath.length === 0 ? 'Root' : currentPath.map(id => {
                    let folder = folderStructure;
                    for (let fId of currentPath) {
                      folder = folder.find(f => f.id === fId);
                      if (fId === id) break;
                    }
                    return folder.name;
                  }).join(' / ')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4 max-h-60 overflow-y-auto">
                {currentFolder.subfolders && currentFolder.subfolders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className="flex items-center p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <Folder size={20} className="text-yellow-500 mr-2" />
                    <span className="text-sm">{folder.name}</span>
                    <ChevronRight size={16} className="ml-auto text-gray-400" />
                  </div>
                ))}
                {currentFolder.tables && currentFolder.tables.map((table) => (
                  <div
                    key={table.id}
                    onClick={() => onSelectTable(table.id)}
                    className="flex items-center p-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <File size={20} className="text-blue-500 mr-2" />
                    <span className="text-sm">{table.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableSelectionModal;