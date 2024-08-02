import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowLeft, Filter } from 'react-feather';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';
import { format, parseISO } from 'date-fns';

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

const FolderCard = ({ folder, onClick, tablesCount }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-blue-500 bg-opacity-20 rounded-xl border border-blue-200 shadow-sm transition-all duration-300 ease-out p-4 w-full cursor-pointer backdrop-filter backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Folder size={20} className="text-black" />
          <span className="text-base font-medium text-black">{folder.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{tablesCount} tables</span>
          <ChevronRight size={20} className="text-black" />
        </div>
      </div>
    </motion.div>
  );
};

const TableCard = ({ table, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-blue-500 bg-opacity-20 rounded-xl border border-blue-200 shadow-sm transition-all duration-300 ease-out p-4 w-full cursor-pointer backdrop-filter backdrop-blur-sm"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <File size={20} className="text-black" />
          <span className="text-base font-medium text-black">{table.name}</span>
        </div>
        <span className="text-sm text-black">
          {table.upload_date ? format(parseISO(table.upload_date), 'MMM dd, yyyy') : 'N/A'}
        </span>
      </div>
    </motion.div>
  );
};

const TableSelectionModal = ({ isOpen, onClose, onSelectTable, folderStructure, currentFolderId, isComparingMode }) => {
  const [step, setStep] = useState('folder');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });

  const filterMenuRef = useRef(null);
  const isFilterActive = dateFilter.start !== null || dateFilter.end !== null;

  useEffect(() => {
    if (isOpen) {
      if (isComparingMode && currentFolderId) {
        setSelectedFolder(currentFolderId);
        setStep('table');
      } else {
        setStep('folder');
        setSelectedFolder(null);
      }
      setSearchTerm('');
      setSortByDate(false);
      setDateFilter({ start: null, end: null });
    }
  }, [isOpen, isComparingMode, currentFolderId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredFolders = useMemo(() => {
    return folderStructure.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folderStructure, searchTerm]);

  const filteredTables = useMemo(() => {
    if (!selectedFolder) return [];
    const folder = folderStructure.find(f => f.id === selectedFolder);
    if (!folder) return [];
    
    return folder.tables
      .filter(table => {
        const nameMatch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
        const dateMatch = 
          (!dateFilter.start || new Date(table.upload_date) >= dateFilter.start) &&
          (!dateFilter.end || new Date(table.upload_date) <= dateFilter.end);
        return nameMatch && dateMatch;
      })
      .sort((a, b) => {
        if (!a.upload_date) return 1;
        if (!b.upload_date) return -1;
        const comparison = new Date(b.upload_date) - new Date(a.upload_date);
        return sortByDate ? comparison : -comparison;
      });
  }, [selectedFolder, folderStructure, searchTerm, sortByDate, dateFilter]);

  const handleFolderSelect = useCallback((folderId) => {
    setSelectedFolder(folderId);
    setStep('table');
    setSearchTerm('');
  }, []);

  const handleTableSelect = useCallback((tableId) => {
    onSelectTable(tableId, selectedFolder);
  }, [onSelectTable, selectedFolder]);

  const renderFolder = useCallback(({ index, style }) => {
    const folder = filteredFolders[index];
    return (
      <div style={style} className="py-2">
        <FolderCard
          folder={folder}
          onClick={() => handleFolderSelect(folder.id)}
          tablesCount={folder.tables.length}
        />
      </div>
    );
  }, [filteredFolders, handleFolderSelect]);

  const renderTable = useCallback(({ index, style }) => {
    const table = filteredTables[index];
    return (
      <div style={style} className="py-2">
        <TableCard
          table={table}
          onClick={() => handleTableSelect(table.id)}
        />
      </div>
    );
  }, [filteredTables, handleTableSelect]);

  const pageVariants = {
    initial: { opacity: 0, x: '-100%' },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: '100%' }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex justify-center items-center z-50 p-8 bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden backdrop-filter backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AnimatedLogo />
                  <h2 className="text-3xl font-black text-black tracking-tight">
                    {isComparingMode ? 'Select Table for Comparison' : (step === 'folder' ? 'Select Folder' : 'Select Table')}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}  // Changed this line to directly call onClose
                  className="text-black hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="p-8 h-[calc(90vh-116px)] flex flex-col"
              >
                <div className="mb-6 flex space-x-4">
                  {step === 'table' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setStep('folder');
                        setSelectedFolder(null);
                        setSearchTerm('');
                      }}
                      className="flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-100 text-black transition-colors duration-200"
                    >
                      <ArrowLeft size={18} />
                      <span className="text-sm font-medium">Back to Folders</span>
                    </motion.button>
                  )}
                  <motion.div 
                    className="flex-grow bg-blue-100 bg-opacity-50 rounded-full py-2 px-4 flex items-center space-x-2"
                    whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                  >
                    <Search size={18} className="text-black" />
                    <input
                      type="text"
                      placeholder={`Search ${step === 'folder' ? 'folders' : 'tables'}...`}
                      className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </motion.div>
                  {step === 'table' && (
                    <>
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
                      <div className="relative">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                            isFilterActive
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-100 text-black'
                          } transition-colors duration-200`}
                        >
                          <Filter size={18} />
                          <span className="text-sm font-medium">Filter</span>
                        </motion.button>
                        <AnimatePresence>
                          {filterMenuOpen && (
                            <motion.div
                              ref={filterMenuRef}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg p-4 z-10"
                            >
                              <h3 className="text-lg font-semibold mb-2">Date Filter</h3>
                              <div className="space-y-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                  <DatePicker
                                    selected={dateFilter.start}
                                    onChange={(date) => setDateFilter(prev => ({ ...prev, start: date }))}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Select start date"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    isClearable
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                                  <DatePicker
                                    selected={dateFilter.end}
                                    onChange={(date) => setDateFilter(prev => ({ ...prev, end: date }))}
                                    dateFormat="yyyy-MM-dd"
                                    placeholderText="Select end date"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                    isClearable
                                  />
                                </div>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDateFilter({ start: null, end: null })}
                                className="mt-4 w-full bg-red-500 text-white rounded-md py-2 text-sm font-medium"
                              >
                                Clear Filter
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-grow overflow-hidden">
                  <AutoSizer>
                    {({ height, width }) => (
                      <List
                        className="scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100"
                        height={height}
                        itemCount={step === 'folder' ? filteredFolders.length : filteredTables.length}
                        itemSize={80}
                        width={width}
                      >
                        {step === 'folder' ? renderFolder : renderTable}
                      </List>
                    )}
                  </AutoSizer>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TableSelectionModal;