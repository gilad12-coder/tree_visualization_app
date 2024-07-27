import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Folder, File, ChevronRight, Search, X, ArrowUp, ArrowDown } from 'react-feather';

const MotionPath = motion.path;

const AnimatedLogo = () => (
  <svg width="40" height="40" viewBox="0 0 50 50">
    <MotionPath
      d="M25,10 L40,40 L10,40 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: "easeInOut" }}
    />
  </svg>
);

const FolderCard = ({ folder, onClick, isExpanded }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="bg-blue-500 bg-opacity-20 rounded-xl border border-blue-200 shadow-sm transition-all duration-300 ease-out p-4 w-full cursor-pointer backdrop-filter backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Folder size={20} className="text-black" />
          <span className="text-base font-medium text-black">{folder.name}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <ChevronRight size={20} className="text-black" />
        </motion.div>
      </div>
    </motion.div>
  );
};

const TableCard = ({ table, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="bg-blue-500 bg-opacity-20 rounded-xl border border-blue-200 shadow-sm transition-all duration-300 ease-out p-4 w-full cursor-pointer backdrop-filter backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <File size={20} className="text-black" />
          <span className="text-base font-medium text-black">{table.name}</span>
        </div>
        <span className="text-sm text-black">{table.upload_date}</span>
      </div>
    </motion.div>
  );
};

const TableSelectionModal = ({ isOpen, onClose, onSelectTable, folderStructure }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDate, setSortByDate] = useState(false);

  const bgOpacity = useMotionValue(0);
  const bgBlur = useTransform(bgOpacity, [0, 1], [0, 10]);

  const handleFolderClick = (folderId) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleTableSelect = (tableId, folderId) => {
    onSelectTable(tableId, folderId);
    onClose();
  };

  const filteredContents = () => {
    return folderStructure.map(folder => ({
      ...folder,
      tables: folder.tables.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    })).filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase()) || folder.tables.length > 0
    );
  };

  const renderFolderContents = () => {
    const filtered = filteredContents();
    return filtered.map((folder) => (
      <motion.div key={folder.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <FolderCard
          folder={folder}
          onClick={() => handleFolderClick(folder.id)}
          isExpanded={expandedFolders[folder.id]}
        />
        {expandedFolders[folder.id] && (
          <div className="ml-6 mt-2">
            {folder.tables
              .sort((a, b) => {
                if (!a.upload_date) return 1;
                if (!b.upload_date) return -1;
                const comparison = new Date(b.upload_date) - new Date(a.upload_date);
                return sortByDate ? -comparison : comparison;
              })
              .map((table) => (
                <motion.div key={table.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <TableCard table={table} onClick={() => handleTableSelect(table.id, folder.id)} />
                </motion.div>
              ))
            }
          </div>
        )}
      </motion.div>
    ));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex justify-center items-center z-50 p-8"
          onClick={onClose}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${bgOpacity.get()})`,
            backdropFilter: `blur(${bgBlur.get()}px)`,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden backdrop-filter backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
            onAnimationComplete={() => bgOpacity.set(0.5)}
          >
            <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AnimatedLogo />
                  <h2 className="text-3xl font-black text-black tracking-tight">Select Table</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="text-black hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
            </div>
            <div className="p-8">
              <div className="mb-6 flex space-x-4">
                <motion.div 
                  className="flex-grow bg-blue-100 bg-opacity-50 rounded-full py-2 px-4 flex items-center space-x-2"
                  whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                >
                  <Search size={18} className="text-black" />
                  <input
                    type="text"
                    placeholder="Search tables and folders..."
                    className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSortByDate(!sortByDate)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                    sortByDate ? 'bg-blue-500 text-white' : 'bg-blue-100 text-black'
                  } transition-colors duration-200`}
                >
                  {sortByDate ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  <span className="text-sm font-medium">Sort by Date</span>
                </motion.button>
              </div>
              <div className="max-h-[calc(80vh-220px)] overflow-y-auto pr-4 space-y-4">
                {renderFolderContents()}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableSelectionModal;