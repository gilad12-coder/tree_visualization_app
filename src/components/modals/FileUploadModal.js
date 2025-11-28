import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Folder,
  File,
  Plus,
  HelpCircle,
  ChevronDown,
  Search,
  FileText,
} from "react-feather";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { useTranslation } from "react-i18next";
import DatePickerWrapper from "../common/DatePickerWrapper";
import "../../styles/datepicker.css";
import '../../styles/scrollbar.css';

const API_BASE_URL = "http://localhost:5001";

// Theme to match SettingsModal
const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

// Logo removed as requested

const convertToUTCDate = (date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const formatDateForAPI = (date) => date.toISOString().split("T")[0];

const FileUploadModal = ({ isOpen, onClose, onUpload, dbPath }) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [uploadDate, setUploadDate] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [folderSelectionType, setFolderSelectionType] = useState("existing");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const fetchFolders = useCallback(async () => {
    if (!dbPath) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/folders`, {
        params: { db_path: dbPath },
      });
      setFolders(response.data);
    } catch (error) {
      console.error("Failed to fetch folders:", error);
      toast.error(t('fileUpload.failedToFetchFolders'));
    }
  }, [dbPath, t]);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      setSelectedFile(null);
      setFolderName("");
      setUploadDate(null);
      setSelectedFolderId("");
      setFolderSelectionType("existing");
      setIsDropdownOpen(false);
      setSearchTerm("");
    }
  }, [isOpen, fetchFolders]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current.click();
  };

  const handleFolderSelection = (folderId) => {
    setSelectedFolderId(folderId);
    setFolderName(folders.find((folder) => folder.id === folderId).name);
    setIsDropdownOpen(false);
  };

  const handleNewFolderNameChange = (event) =>
    setFolderName(event.target.value);
  const handleUploadDateChange = (date) => setUploadDate(date);

  const handleUpload = async () => {
    if (
      selectedFile &&
      ((folderSelectionType === "existing" && selectedFolderId) ||
        (folderSelectionType === "new" && folderName)) &&
      uploadDate
    ) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder_name", folderName);
      formData.append(
        "is_new_folder",
        folderSelectionType === "new" ? "true" : "false"
      );
      if (folderSelectionType === "existing")
        formData.append("folder_id", selectedFolderId);
      formData.append(
        "upload_date",
        formatDateForAPI(convertToUTCDate(uploadDate))
      );
      formData.append("db_path", dbPath);

      try {
        const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        onUpload(response.data);
        onClose();
        toast.success(t('fileUpload.uploadSuccess'));
      } catch (error) {
        console.error("Failed to upload file:", error);
        toast.error(
          error.response?.data?.error || t('fileUpload.failedToUpload')
        );
      }
    }
  };

  const handleDownloadGuide = () => {
    const link = document.createElement("a");
    link.href = process.env.PUBLIC_URL + "מדריך מפורט להעלאת נתונים.pdf";
    link.download = "be-net_file_upload_guide.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFolders = folders.filter((folder) =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUploadDisabled =
    !selectedFile ||
    !uploadDate ||
    (folderSelectionType === "new" && !folderName) ||
    (folderSelectionType === "existing" && !selectedFolderId);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <div className="flex-grow"></div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                {/* File Upload Area */}
                <motion.div
                  className={`bg-gray-50 rounded-lg p-5 flex flex-col items-center justify-center space-y-3 border border-dashed ${
                    isDragging
                      ? "border-gray-500"
                      : selectedFile
                      ? "border-gray-400"
                      : "border-gray-300"
                  } cursor-pointer`}
                  whileHover={{
                    boxShadow: "0 0 0 2px rgba(31, 41, 55, 0.1)",
                    backgroundColor: "#F3F4F6"
                  }}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={handleAreaClick}
                >
                  {selectedFile ? (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center"
                    >
                      <FileText size={40} className="text-black mb-2" />
                      <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </motion.div>
                  ) : (
                    <>
                      <File size={36} className="text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700">
                          {t('fileUpload.dragAndDrop')}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('fileUpload.clickToBrowse')}
                        </p>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </motion.div>

                {/* Folder Selection Tabs */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFolderSelectionType("existing")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                      folderSelectionType === "existing"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: folderSelectionType === "existing" ? THEME.primary : undefined
                    }}
                  >
                    {t('fileUpload.existingFolder')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFolderSelectionType("new")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                      folderSelectionType === "new"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: folderSelectionType === "new" ? THEME.primary : undefined
                    }}
                  >
                    {t('fileUpload.newFolder')}
                  </motion.button>
                </div>

                {/* Folder Selection */}
                {folderSelectionType === "existing" && (
                  <div className="relative" ref={dropdownRef}>
                    <motion.button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md shadow-sm transition-colors flex items-center justify-between text-sm"
                      whileHover={{
                        borderColor: "#9CA3AF"
                      }}
                    >
                      <span className="truncate">
                        {selectedFolderId
                          ? folders.find((f) => f.id === selectedFolderId)?.name
                          : t('fileUpload.selectAFolder')}
                      </span>
                      <ChevronDown
                        size={18}
                        className={`transform transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        } text-gray-500`}
                      />
                    </motion.button>
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden"
                        >
                          <div className="sticky top-0 bg-white p-2 border-b border-gray-100 z-10">
                            <div className="flex items-center bg-gray-50 rounded-md px-3 py-2">
                              <Search size={16} className="text-gray-400 mr-2 rtl:mr-0 rtl:ml-2" />
                              <input
                                type="text"
                                placeholder={t('fileUpload.searchFolders')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent w-full outline-none text-sm"
                              />
                            </div>
                          </div>
                          <div
                            className="overflow-y-auto custom-scrollbar"
                            style={{ maxHeight: "180px" }}
                          >
                            {filteredFolders.length > 0 ? (
                              filteredFolders.map((folder) => (
                                <button
                                  key={folder.id}
                                  onClick={() => handleFolderSelection(folder.id)}
                                  className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm ${
                                    selectedFolderId === folder.id ? 'bg-gray-50 font-medium' : ''
                                  }`}
                                >
                                  <Folder size={16} className="text-gray-500" />
                                  <span className="truncate">{folder.name}</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                {t('fileUpload.noFoldersFound')}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {folderSelectionType === "new" && (
                  <div>
                    <motion.div
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      whileHover={{
                        borderColor: "#9CA3AF"
                      }}
                    >
                      <Plus size={18} className="text-gray-500 mr-2 rtl:mr-0 rtl:ml-2" />
                      <input
                        type="text"
                        value={folderName}
                        onChange={handleNewFolderNameChange}
                        placeholder={t('fileUpload.enterNewFolderName')}
                        className="bg-transparent w-full outline-none text-sm"
                      />
                    </motion.div>
                  </div>
                )}

                {/* Date Selection */}
                <div>
                  <DatePickerWrapper
                    date={uploadDate}
                    handleDateChange={handleUploadDateChange}
                    placeholderText={t('fileUpload.selectUploadDate')}
                    wrapperColor="bg-white"
                    wrapperOpacity=""
                    containerClassName="border border-gray-300 rounded-md shadow-sm hover:border-gray-400 transition-colors"
                  />
                </div>

                {/* Help and Upload Buttons */}
                <div className="flex gap-3 pt-2">
                  <motion.button
                    whileHover={!isUploadDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isUploadDisabled ? { scale: 0.98 } : {}}
                    onClick={handleUpload}
                    className={`flex-grow px-4 py-2.5 rounded-md text-white font-medium text-sm flex items-center justify-center gap-2 ${
                      isUploadDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-800"
                    }`}
                    style={{ backgroundColor: THEME.buttonColor }}
                    disabled={isUploadDisabled}
                  >
                    <Upload size={18} />
                    <span>{t('fileUpload.uploadFile')}</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDownloadGuide}
                    className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    title={t('fileUpload.downloadGuide')}
                  >
                    <HelpCircle size={18} />
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