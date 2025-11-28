import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, Search, X, ArrowUp, ArrowDown, ArrowLeft, Filter, Edit2, Trash2 } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from 'axios';
import DatePickerWrapper from '../common/DatePickerWrapper';
import '../../styles/scrollbar.css';

const API_BASE_URL = "http://localhost:5001";

const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const FolderCard = ({ folder, onClick, tablesCount, t, isEditing, editName, onStartEdit, onSaveEdit, onCancelEdit, onNameChange, onDelete }) => {
  if (!folder) return null;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(folder);
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    onStartEdit(folder);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    await onSaveEdit();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    onCancelEdit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01, backgroundColor: "#F3F4F6" }}
      whileTap={{ scale: 0.99 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ease-out p-4 w-full cursor-pointer"
      onClick={isEditing ? undefined : onClick}
      transition={{ duration: 0.1 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Folder size={20} className="text-gray-500 flex-shrink-0" />
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="flex-1 px-2 py-1 text-base font-medium text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          ) : (
            <span className="text-base font-medium text-gray-800 truncate">{folder.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isEditing && <span className="text-sm text-gray-600">{tablesCount} {t('tableSelection.tables')}</span>}
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title={t('common.cancel')}
              >
                <X size={16} className="text-gray-600" />
              </button>
              <button
                onClick={handleSave}
                className="p-1.5 hover:bg-green-100 rounded transition-colors"
                title={t('common.save')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEdit}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title={t('common.edit')}
              >
                <Edit2 size={16} className="text-gray-600" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-red-100 rounded transition-colors"
                title={t('common.delete')}
              >
                <Trash2 size={16} className="text-red-600" />
              </button>
              <ChevronRight size={18} className="text-gray-500" />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const TableCard = ({ table, onClick, isActive, t, isEditing, editName, editDate, onStartEdit, onSaveEdit, onCancelEdit, onNameChange, onDateChange, onDelete }) => {
  if (!table) return null;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(table);
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    onStartEdit(table);
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    await onSaveEdit();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    onCancelEdit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: isEditing ? 1 : 1.01, backgroundColor: isEditing ? undefined : (isActive ? THEME.primaryLight : "#F3F4F6") }}
      whileTap={{ scale: isEditing ? 1 : 0.99 }}
      className={`${
        isActive && !isEditing
          ? `bg-gray-900 text-white`
          : 'bg-white text-gray-800'
      } rounded-lg border border-gray-200 shadow-sm transition-all duration-200 ease-out p-4 w-full ${!isEditing ? 'cursor-pointer' : ''}`}
      onClick={isEditing ? undefined : onClick}
      transition={{ duration: 0.1 }}
      style={{ backgroundColor: isActive && !isEditing ? THEME.primary : undefined }}
    >
      {isEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <File size={20} className="text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={editName}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 px-2 py-1 text-base font-medium text-gray-800 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder={t('tableSelection.tableName')}
            />
          </div>
          <div className="flex items-center gap-2 ml-8">
            <DatePickerWrapper
              date={editDate}
              handleDateChange={onDateChange}
              isRange={false}
              placeholderText={t('tableSelection.selectDate')}
              wrapperColor="bg-white"
              wrapperOpacity=""
              containerClassName="border border-gray-300 rounded-md shadow-sm hover:border-gray-400 transition-colors"
            />
            <button
              onClick={handleCancel}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              title={t('common.cancel')}
            >
              <X size={16} className="text-gray-600" />
            </button>
            <button
              onClick={handleSave}
              className="p-1.5 hover:bg-green-100 rounded transition-colors"
              title={t('common.save')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File size={20} className={isActive ? "text-white flex-shrink-0" : "text-gray-500 flex-shrink-0"} />
            <span className="text-base font-medium truncate">{table.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-sm whitespace-nowrap">
              {table.upload_date ? format(parseISO(table.upload_date), 'MMM dd, yyyy') : 'N/A'}
            </span>
            <button
              onClick={handleStartEdit}
              className={`p-1.5 rounded transition-colors ${
                isActive ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
              title={t('common.edit')}
            >
              <Edit2 size={16} className={isActive ? "text-white" : "text-gray-600"} />
            </button>
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded transition-colors ${
                isActive ? 'hover:bg-red-900' : 'hover:bg-red-100'
              }`}
              title={t('common.delete')}
            >
              <Trash2 size={16} className="text-red-600" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const TableSelectionModal = ({ isOpen, onClose, onSelectTable, folderStructure = [], currentFolderId, isComparingMode, currentTableId, dbPath, onRefresh }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('folder');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });

  // Edit/Delete states
  const [editMode, setEditMode] = useState(null); // 'folder' or 'table'
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  // Edit handlers
  const handleEditFolder = useCallback((folder) => {
    setEditMode('folder');
    setEditItem(folder);
    setEditName(folder.name);
  }, []);

  const handleEditTable = useCallback((table) => {
    setEditMode('table');
    setEditItem(table);
    setEditName(table.name);
    setEditDate(table.upload_date ? parseISO(table.upload_date) : null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editItem || !editName.trim()) return;

    try {
      if (editMode === 'folder') {
        await axios.put(`${API_BASE_URL}/folder/${editItem.id}`, {
          name: editName
        }, { params: { db_path: dbPath } });
        toast.success(t('tableSelection.folderUpdated'));
      } else if (editMode === 'table') {
        await axios.put(`${API_BASE_URL}/table/${editItem.id}`, {
          name: editName,
          upload_date: editDate ? format(editDate, 'yyyy-MM-dd') : null
        }, { params: { db_path: dbPath } });
        toast.success(t('tableSelection.tableUpdated'));
      }

      setEditMode(null);
      setEditItem(null);
      setEditName('');
      setEditDate(null);

      // Refresh folder structure without reloading the page
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error(t('tableSelection.updateFailed'));
    }
  }, [editItem, editName, editMode, editDate, dbPath, t, onRefresh]);

  // Delete handlers
  const handleDeleteFolder = useCallback((folder) => {
    setDeleteConfirm({ type: 'folder', item: folder });
  }, []);

  const handleDeleteTable = useCallback((table) => {
    setDeleteConfirm({ type: 'table', item: table });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'folder') {
        await axios.delete(`${API_BASE_URL}/folder/${deleteConfirm.item.id}`, {
          params: { db_path: dbPath }
        });
        toast.success(t('tableSelection.folderDeleted'));
        // If we deleted the current folder, go back to folder selection
        if (deleteConfirm.item.id === selectedFolder) {
          setSelectedFolder(null);
          setStep('folder');
        }
      } else if (deleteConfirm.type === 'table') {
        await axios.delete(`${API_BASE_URL}/table/${deleteConfirm.item.id}`, {
          params: { db_path: dbPath }
        });
        toast.success(t('tableSelection.tableDeleted'));
      }

      setDeleteConfirm(null);

      // Refresh folder structure without reloading the page
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error(t('tableSelection.deleteFailed'));
    }
  };

  const handleCancelEdit = useCallback(() => {
    setEditMode(null);
    setEditItem(null);
    setEditName('');
    setEditDate(null);
  }, []);

  const renderFolder = useCallback(({ index, style }) => {
    const folder = filteredFolders[index];
    if (!folder) return null;
    const isEditing = editMode === 'folder' && editItem?.id === folder.id;
    return (
      <div style={style} className="px-4 py-2">
        <FolderCard
          folder={folder}
          onClick={() => handleFolderSelect(folder.id)}
          tablesCount={Array.isArray(folder.tables) ? folder.tables.length : 0}
          t={t}
          isEditing={isEditing}
          editName={editName}
          onStartEdit={handleEditFolder}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onNameChange={setEditName}
          onDelete={handleDeleteFolder}
        />
      </div>
    );
  }, [filteredFolders, handleFolderSelect, t, editMode, editItem, editName, handleEditFolder, handleSaveEdit, handleCancelEdit, handleDeleteFolder]);

  const renderTable = useCallback(({ index, style }) => {
    const table = filteredTables[index];
    if (!table) return null;
    const isEditing = editMode === 'table' && editItem?.id === table.id;
    return (
      <div style={style} className="px-4 py-2">
        <TableCard
          table={table}
          onClick={() => handleTableSelect(table.id)}
          isActive={table.id === currentTableId}
          t={t}
          isEditing={isEditing}
          editName={editName}
          editDate={editDate}
          onStartEdit={handleEditTable}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onNameChange={setEditName}
          onDateChange={setEditDate}
          onDelete={handleDeleteTable}
        />
      </div>
    );
  }, [filteredTables, handleTableSelect, currentTableId, t, editMode, editItem, editName, editDate, handleEditTable, handleSaveEdit, handleCancelEdit, handleDeleteTable]);

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

          {/* Delete Confirmation Dialog */}
          <AnimatePresence>
            {deleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                onClick={() => setDeleteConfirm(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex justify-end items-center p-4 border-b border-gray-100">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      {deleteConfirm.type === 'folder'
                        ? t('tableSelection.deleteFolderWarning', { name: deleteConfirm.item.name })
                        : t('tableSelection.deleteTableWarning', { name: deleteConfirm.item.name })
                      }
                    </p>

                    {deleteConfirm.type === 'folder' && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-red-700 font-medium text-xs">
                          {t('tableSelection.deleteFolderTablesWarning')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-md text-sm font-medium transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TableSelectionModal;