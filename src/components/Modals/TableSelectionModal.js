import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowLeft, Filter } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import DatePickerWrapper from '../HelperComponents/DatePickerWrapper';
import '../../styles/scrollbar.css';

const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const FolderCard = ({ folder, onClick, tablesCount, t }) => {
  if (!folder) return null;
  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: "#F3F4F6" }}
      whileTap={{ scale: 0.99 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ease-out p-4 w-full cursor-pointer"
      onClick={onClick}
      transition={{ duration: 0.1 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Folder size={20} className="text-gray-500" />
          <span className="text-base font-medium text-gray-800 truncate">{folder.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{tablesCount} {t('tableSelection.tables')}</span>
          <ChevronRight size={18} className="text-gray-500" />
        </div>
      </div>
    </motion.div>
  );
};

const TableCard = ({ table, onClick, isActive }) => {
  if (!table) return null;
  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: isActive ? THEME.primaryLight : "#F3F4F6" }}
      whileTap={{ scale: 0.99 }}
      className={`${
        isActive
          ? `bg-gray-900 text-white`
          : 'bg-white text-gray-800'
      } rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ease-out p-4 w-full cursor-pointer`}
      onClick={onClick}
      transition={{ duration: 0.1 }}
      style={{ backgroundColor: isActive ? THEME.primary : undefined }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-grow">
          <File size={20} className={isActive ? "text-white" : "text-gray-500"} />
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
  const { t } = useTranslation();
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
          t={t}
        />
      </div>
    );
  }, [filteredFolders, handleFolderSelect, t]);

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
    exit: { opacity: 0, x: '100%' }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-end items-center p-4 border-b border-gray-100">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="p-6 h-[calc(90vh-60px)] flex flex-col"
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {step === 'table' && (
                  <button
                    onClick={() => {
                      setStep('folder');
                      setSelectedFolder(null);
                      setSearchTerm('');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm"
                  >
                    <ArrowLeft size={16} />
                    <span className="font-medium">{t('tableSelection.backToFolders')}</span>
                  </button>
                )}
                <div className="flex-grow bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 flex items-center gap-2 min-w-[200px] hover:border-gray-400 transition-colors">
                  <Search size={18} className="text-gray-500" />
                  <input
                    type="text"
                    placeholder={step === 'folder' ? t('tableSelection.searchFolders') : t('tableSelection.searchTables')}
                    className="bg-transparent w-full outline-none text-sm text-gray-700 placeholder-gray-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {step === 'table' && (
                  <>
                    <button
                      onClick={() => setSortByDate(!sortByDate)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                        sortByDate
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={{ backgroundColor: sortByDate ? THEME.primary : undefined }}
                    >
                      {sortByDate ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      <span className="font-medium">{t('tableSelection.sortByDate')}</span>
                    </button>
                    <div className="relative">
                      <button
                        ref={filterButtonRef}
                        onClick={toggleFilterMenu}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
                          isFilterActive
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{ backgroundColor: isFilterActive ? THEME.primary : undefined }}
                      >
                        <Filter size={16} />
                        <span className="font-medium">{t('tableSelection.filter')}</span>
                      </button>
                      <AnimatePresence>
                        {filterMenuOpen && (
                          <motion.div
                            ref={filterMenuRef}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 rtl:right-auto rtl:left-0 mt-1 w-64 bg-white rounded-md shadow-lg p-4 z-10 border border-gray-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <h3 className="text-base font-medium text-gray-800 mb-3">{t('tableSelection.dateFilter')}</h3>
                            <div className="space-y-2">
                              <DatePickerWrapper
                                date={[dateFilter.start, dateFilter.end]}
                                handleDateChange={handleDateFilterChange}
                                isRange={true}
                                placeholderText={t('tableSelection.selectDateRange')}
                                wrapperColor="bg-white"
                                wrapperOpacity=""
                                containerClassName="border border-gray-300 rounded-md shadow-sm hover:border-gray-400 transition-colors"
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDateFilter({ start: null, end: null });
                                setFilterMenuOpen(false);
                              }}
                              className="mt-4 w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <span>{t('tableSelection.clearFilter')}</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
              <div className="flex-grow overflow-hidden rounded-md border border-gray-100">
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