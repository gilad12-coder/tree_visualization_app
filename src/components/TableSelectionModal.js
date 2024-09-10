import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowLeft, Filter } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, parseISO } from 'date-fns';
import DatePickerWrapper from './DatePickerWrapper';
import '../styles/scrollbar.css';

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
  if (!folder) return null;
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
          <span className="text-base font-medium text-black truncate">{folder.name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{tablesCount} tables</span>
          <ChevronRight size={20} className="text-black" />
        </div>
      </div>
    </motion.div>
  );
};

const TableCard = ({ table, onClick, isActive }) => {
  if (!table) return null;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${
        isActive
          ? 'bg-blue-500 text-white'
          : 'bg-blue-500 bg-opacity-20 text-black'
      } rounded-xl border border-blue-200 shadow-sm transition-all duration-300 ease-out p-4 w-full cursor-pointer backdrop-filter backdrop-blur-sm`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-grow">
          <File size={20} className={isActive ? "text-white" : "text-black"} />
          <span className="text-base font-medium truncate">{table.name}</span>
        </div>
        <span className="text-sm whitespace-nowrap ml-2">
          {table.upload_date ? format(parseISO(table.upload_date), 'MMM dd, yyyy') : 'N/A'}
        </span>
      </div>
    </motion.div>
  );
};

const TableSelectionModal = ({ isOpen, onClose, onSelectTable, folderStructure = [], currentFolderId, isComparingMode, currentTableId }) => {
  const [step, setStep] = useState('folder');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });

  const filterMenuRef = useRef(null);
  const filterButtonRef = useRef(null);
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
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target) &&
          filterButtonRef.current && !filterButtonRef.current.contains(event.target)) {
        setFilterMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredFolders = useMemo(() => {
    if (!Array.isArray(folderStructure)) {
      console.warn('folderStructure is not an array:', folderStructure);
      return [];
    }
    return folderStructure.filter(folder => 
      folder && folder.name && folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folderStructure, searchTerm]);

  const filteredTables = useMemo(() => {
    if (!selectedFolder || !Array.isArray(folderStructure)) return [];
    const folder = folderStructure.find(f => f && f.id === selectedFolder);
    if (!folder || !Array.isArray(folder.tables)) return [];
    
    return folder.tables
      .filter(table => {
        if (!table || !table.name) return false;
        const nameMatch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
        const dateMatch = 
          (!dateFilter.start || (table.upload_date && new Date(table.upload_date) >= dateFilter.start)) &&
          (!dateFilter.end || (table.upload_date && new Date(table.upload_date) <= dateFilter.end));
        return nameMatch && dateMatch;
      })
      .sort((a, b) => {
        if (!a.upload_date) return 1;
        if (!b.upload_date) return -1;
        const comparison = new Date(b.upload_date) - new Date(a.upload_date);
        return sortByDate ? -comparison : comparison;
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

  const handleDateFilterChange = (dates) => {
    setDateFilter({ start: dates[0], end: dates[1] });
    if (dates[0] && dates[1]) {
      setFilterMenuOpen(false);
    }
  };

  const toggleFilterMenu = useCallback((e) => {
    e.stopPropagation();
    setFilterMenuOpen(prevState => !prevState);
  }, []);

  const renderFolder = useCallback(({ index, style }) => {
    const folder = filteredFolders[index];
    if (!folder) return null;
    return (
      <div style={style} className="px-4 py-2">
        <FolderCard
          folder={folder}
          onClick={() => handleFolderSelect(folder.id)}
          tablesCount={Array.isArray(folder.tables) ? folder.tables.length : 0}
        />
      </div>
    );
  }, [filteredFolders, handleFolderSelect]);

  const renderTable = useCallback(({ index, style }) => {
    const table = filteredTables[index];
    if (!table) return null;
    return (
      <div style={style} className="px-4 py-2">
        <TableCard
          table={table}
          onClick={() => handleTableSelect(table.id)}
          isActive={table.id === currentTableId}
        />
      </div>
    );
  }, [filteredTables, handleTableSelect, currentTableId]);

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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-black bg-opacity-50"
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
          <div className="p-6 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <AnimatedLogo />
                <h2 className="text-2xl font-black text-black tracking-tight">
                  {isComparingMode ? 'Select Table for Comparison' : (step === 'folder' ? 'Select Folder' : 'Select Table')}
                </h2>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="p-6 h-[calc(90vh-88px)] flex flex-col"
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {step === 'table' && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setStep('folder');
                      setSelectedFolder(null);
                      setSearchTerm('');
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-full bg-blue-100 text-black transition-colors duration-200"
                  >
                    <ArrowLeft size={16} />
                    <span className="text-sm font-medium">Back to Folders</span>
                  </motion.button>
                )}
                <motion.div 
                  className="flex-grow bg-blue-100 bg-opacity-50 rounded-full py-2 px-4 flex items-center space-x-2 min-w-[200px]"
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
                      className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                        sortByDate ? 'bg-blue-500 text-white' : 'bg-blue-100 text-black'
                      } transition-colors duration-200`}
                    >
                      {sortByDate ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      <span className="text-sm font-medium">Sort by Date</span>
                    </motion.button>
                    <div className="relative">
                      <motion.button
                        ref={filterButtonRef}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleFilterMenu}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                          isFilterActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-black'
                        } transition-colors duration-200`}
                      >
                        <Filter size={16} />
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h3 className="text-lg font-semibold mb-2">Date Filter</h3>
                            <div className="space-y-2">
                              <DatePickerWrapper
                                date={[dateFilter.start, dateFilter.end]}
                                handleDateChange={handleDateFilterChange}
                                isRange={true}
                                placeholderText="Select date range"
                                wrapperColor="bg-blue-50"
                                wrapperOpacity="bg-opacity-50"
                              />
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDateFilter({ start: null, end: null });
                                setFilterMenuOpen(false);
                              }}
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
                      className="custom-scrollbar"
                      height={height}
                      itemCount={step === 'folder' ? filteredFolders.length : filteredTables.length}
                      itemSize={80}
                      width={width}
                      itemData={step === 'folder' ? filteredFolders : filteredTables}
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
    </AnimatePresence>
  );
};

export default TableSelectionModal;