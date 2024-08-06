import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Folder, File, Calendar, Plus, HelpCircle, ChevronDown, Search} from 'react-feather';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const AnimatedLogo = () => (
  <svg width="40" height="40" viewBox="0 0 50 50">
    <motion.path
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

const convertToUTCDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const formatDateForAPI = (date) => date.toISOString().split('T')[0];

const FileUploadModal = ({ isOpen, onClose, onUpload, dbPath }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [uploadDate, setUploadDate] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [folderSelectionType, setFolderSelectionType] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      setSelectedFile(null);
      setFolderName('');
      setUploadDate(null);
      setSelectedFolderId('');
      setFolderSelectionType(null);
      setSearchTerm('');
    }
  }, [isOpen, fetchFolders]);

  const handleFileChange = (event) => setSelectedFile(event.target.files[0]);
  const handleFolderSelection = (folderId) => {
    setSelectedFolderId(folderId);
    setFolderName(folders.find(folder => folder.id === folderId).name);
    setIsDropdownOpen(false);
  };
  const handleNewFolderNameChange = (event) => setFolderName(event.target.value);
  const handleUploadDateChange = (date) => setUploadDate(date);

  const handleUpload = async () => {
    if (selectedFile && ((folderSelectionType === 'existing' && selectedFolderId) || (folderSelectionType === 'new' && folderName)) && uploadDate) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder_name', folderName);
      formData.append('is_new_folder', folderSelectionType === 'new' ? 'true' : 'false');
      if (folderSelectionType === 'existing') formData.append('folder_id', selectedFolderId);
      formData.append('upload_date', formatDateForAPI(convertToUTCDate(uploadDate)));
      formData.append('db_path', dbPath);

      try {
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onUpload(response.data);
        onClose();
        toast.success('File uploaded successfully!');
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.error(error.response?.data?.error || 'Failed to upload file. Please try again.');
      }
    }
  };

  const handleDownloadGuide = () => {
    const link = document.createElement('a');
    link.href = process.env.PUBLIC_URL + 'מדריך מפורט להעלאת נתונים.pdf';
    link.download = 'be-net_file_upload_guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-black bg-opacity-50"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden backdrop-filter backdrop-blur-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <AnimatedLogo />
                    <h2 className="text-2xl font-black text-black tracking-tight">Upload File</h2>
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
              <div className="p-6 space-y-4">
                <motion.div 
                  className="bg-blue-100 bg-opacity-50 rounded-xl p-3 flex items-center space-x-3"
                  whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                >
                  <File size={20} className="text-black" />
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="bg-transparent w-full outline-none text-sm text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 transition-colors"
                  />
                </motion.div>

                <div className="flex space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFolderSelectionType('existing')}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold ${folderSelectionType === 'existing' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-black'} transition-colors duration-200`}
                  >
                    Existing Folder
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFolderSelectionType('new')}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold ${folderSelectionType === 'new' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-black'} transition-colors duration-200`}
                  >
                    New Folder
                  </motion.button>
                </div>

                {folderSelectionType === 'existing' && (
                  <div className="relative">
                    <motion.button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-3 bg-blue-100 bg-opacity-50 text-black rounded-xl transition-colors flex items-center justify-between text-sm font-semibold"
                      whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                    >
                      <span>{selectedFolderId ? folders.find(f => f.id === selectedFolderId).name : "Select a folder"}</span>
                      <ChevronDown size={20} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </motion.button>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-lg max-h-60 overflow-hidden"
                      >
                        <div className="p-2 border-b">
                          <div className="flex items-center bg-blue-100 bg-opacity-50 rounded-lg px-3 py-2">
                            <Search size={16} className="text-gray-500 mr-2" />
                            <input
                              type="text"
                              placeholder="Search folders..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="bg-transparent w-full outline-none text-sm"
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-48">
                          {filteredFolders.map(folder => (
                            <motion.button
                              key={folder.id}
                              onClick={() => handleFolderSelection(folder.id)}
                              className="w-full px-4 py-2 text-left hover:bg-blue-100 transition-colors flex items-center space-x-2 text-sm font-semibold"
                              whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                            >
                              <Folder size={16} />
                              <span>{folder.name}</span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {folderSelectionType === 'new' && (
                  <motion.div 
                    className="bg-blue-100 bg-opacity-50 rounded-xl p-3 flex items-center space-x-3"
                    whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                  >
                    <Plus size={20} className="text-black" />
                    <input
                      type="text"
                      value={folderName}
                      onChange={handleNewFolderNameChange}
                      placeholder="Enter new folder name"
                      className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500 font-semibold"
                    />
                  </motion.div>
                )}

                <motion.div 
                  className="bg-blue-100 bg-opacity-50 rounded-xl p-3 flex items-center space-x-3"
                  whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
                >
                  <Calendar size={20} className="text-black" />
                  <DatePicker
                    selected={uploadDate}
                    onChange={handleUploadDateChange}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Select upload date"
                    className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500 font-semibold"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={15}
                    scrollableYearDropdown
                    popperClassName="date-picker-popper"
                    calendarClassName="custom-calendar"
                    wrapperClassName="date-picker-wrapper"
                  />
                </motion.div>
                <div className="flex space-x-2">
                  <motion.button
                    whileHover={!isUploadDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isUploadDisabled ? { scale: 0.98 } : {}}
                    onClick={handleUpload}
                    className={`flex-grow px-4 py-3 bg-blue-500 text-white rounded-xl transition-colors flex items-center justify-center space-x-2 ${
                      isUploadDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                    disabled={isUploadDisabled}
                  >
                    <Upload size={20} />
                    <span className="font-bold text-sm">Upload</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadGuide}
                    className="px-4 py-3 bg-blue-100 text-black rounded-xl transition-colors flex items-center justify-center"
                  >
                    <HelpCircle size={20} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FileUploadModal;
