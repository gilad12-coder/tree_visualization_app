import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Folder, File, Calendar, Plus } from 'react-feather';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

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

const convertToUTCDate = (date) => {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

const formatDateForAPI = (date) => {
  return date.toISOString().split('T')[0];
};

const FileUploadModal = ({ isOpen, onClose, onUpload, dbPath }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [uploadDate, setUploadDate] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [folderSelectionType, setFolderSelectionType] = useState(null);

  const fetchFolders = useCallback(async () => {
    if (!dbPath) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/folders`, { params: { db_path: dbPath } });
      setFolders(response.data);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      toast.error('Failed to fetch folders. Please try again.');
    }
  }, [dbPath]);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen, fetchFolders]);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFolderSelection = (folderId) => {
    setSelectedFolderId(folderId);
    setFolderName(folders.find(folder => folder.id === folderId).name);
  };

  const handleNewFolderNameChange = (event) => {
    setFolderName(event.target.value);
  };

  const handleUploadDateChange = (date) => {
    setUploadDate(date);
  };

  const handleUpload = async () => {
    if (selectedFile && ((folderSelectionType === 'existing' && selectedFolderId) || (folderSelectionType === 'new' && folderName)) && uploadDate) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder_name', folderName);
      formData.append('is_new_folder', folderSelectionType === 'new' ? 'true' : 'false');
      if (folderSelectionType === 'existing') {
        formData.append('folder_id', selectedFolderId);
      }
      
      const utcDate = convertToUTCDate(uploadDate);
      const formattedDate = formatDateForAPI(utcDate);
      formData.append('upload_date', formattedDate);
      formData.append('db_path', dbPath);

      try {
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        onUpload(response.data);
        
        setSelectedFile(null);
        setFolderName('');
        setUploadDate(null);
        setSelectedFolderId('');
        setFolderSelectionType(null);
        onClose();
        toast.success('File uploaded successfully!');
      } catch (error) {
        console.error('Failed to upload file:', error);
        if (error.response && error.response.data && error.response.data.error) {
          toast.error(error.response.data.error);
        } else {
          toast.error('Failed to upload file. Please try again.');
        }
      }
    }
  };

  const isUploadDisabled = !selectedFile || !uploadDate || (folderSelectionType === 'new' && !folderName) || (folderSelectionType === 'existing' && !selectedFolderId);

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
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
              className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden backdrop-filter backdrop-blur-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <AnimatedLogo />
                    <h2 className="text-3xl font-black text-black tracking-tight">Upload File</h2>
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
              <div className="p-8 space-y-6">
                <motion.div 
                  className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4"
                  whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                >
                  <div className="flex items-center space-x-3">
                    <File size={20} className="text-black" />
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="bg-transparent w-full outline-none text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                    />
                  </div>
                </motion.div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Select Folder</h3>
                  <div className="flex space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFolderSelectionType('existing')}
                      className={`flex-1 py-2 px-4 rounded-lg ${folderSelectionType === 'existing' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                    >
                      Existing Folder
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFolderSelectionType('new')}
                      className={`flex-1 py-2 px-4 rounded-lg ${folderSelectionType === 'new' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                    >
                      New Folder
                    </motion.button>
                  </div>
                </div>

                {folderSelectionType === 'existing' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-600">Choose an existing folder:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {folders.map(folder => (
                        <motion.button
                          key={folder.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFolderSelection(folder.id)}
                          className={`py-2 px-4 rounded-lg text-left ${selectedFolderId === folder.id ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
                        >
                          <Folder size={16} className="inline mr-2" />
                          {folder.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {folderSelectionType === 'new' && (
                  <motion.div 
                    className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4"
                    whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                  >
                    <div className="flex items-center space-x-3">
                      <Plus size={20} className="text-black" />
                      <input
                        type="text"
                        value={folderName}
                        onChange={handleNewFolderNameChange}
                        placeholder="Enter new folder name"
                        className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500"
                      />
                    </div>
                  </motion.div>
                )}

                <motion.div 
                  className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4 relative"
                  whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                >
                  <div className="flex items-center space-x-3">
                    <Calendar size={20} className="text-black" />
                    <DatePicker
                      selected={uploadDate}
                      onChange={handleUploadDateChange}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select upload date"
                      className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={15}
                      scrollableYearDropdown
                      popperClassName="date-picker-popper"
                      calendarClassName="custom-calendar"
                      wrapperClassName="date-picker-wrapper"
                    />
                  </div>
                </motion.div>

                <motion.button
                  whileHover={!isUploadDisabled ? { scale: 1.02, y: -5 } : {}}
                  whileTap={!isUploadDisabled ? { scale: 0.98 } : {}}
                  onClick={handleUpload}
                  className={`w-full px-4 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl transition-colors flex items-center justify-center space-x-2 ${
                    isUploadDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-600 hover:bg-opacity-30'
                  }`}
                  disabled={isUploadDisabled}
                >
                  <Upload size={20} />
                  <span className="font-bold">Upload</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FileUploadModal;