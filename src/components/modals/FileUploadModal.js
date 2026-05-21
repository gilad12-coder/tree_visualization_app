import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  X,
  Upload,
  File,
  HelpCircle,
  FileText,
  Edit3,
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

const FileUploadModal = ({ isOpen, onClose, onUpload, dbPath, preselectedFolderId, folderStructure = [] }) => {
  const { t } = useTranslation();
  const [creationMethod, setCreationMethod] = useState("upload"); // "upload" or "build"
  const [selectedFile, setSelectedFile] = useState(null);
  const [tableName, setTableName] = useState(""); // Changed from folderName to tableName
  const [uploadDate, setUploadDate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [treeName, setTreeName] = useState("");
  const [folderName, setFolderName] = useState(""); // Store folder name for create-tree
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && dbPath) {
      // Always default to upload method when modal opens
      setCreationMethod("upload");

      setSelectedFile(null);
      setTableName("");
      setUploadDate(null);
      setTreeName("");

      // Look up folder name from folder ID
      if (preselectedFolderId && folderStructure.length > 0) {
        const folder = folderStructure.find(f => f.id === preselectedFolderId);
        if (folder) {
          setFolderName(folder.name);
        }
      }
    }
  }, [isOpen, dbPath, preselectedFolderId, folderStructure]);

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

  const handleTableNameChange = (event) => setTableName(event.target.value);
  const handleUploadDateChange = (date) => setUploadDate(date);

  const handleUpload = async () => {
    if (selectedFile && preselectedFolderId && uploadDate) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder_id", preselectedFolderId);
      formData.append("is_new_folder", "false");
      if (tableName) {
        formData.append("table_name", tableName);
      }
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

  const handleBuildTree = async () => {
    if (treeName && folderName && uploadDate) {
      // Create empty tree structure with just the root node
      const nodes = {
        root: { id: 'root', children: [] }
      };

      try {
        const response = await axios.post(`${API_BASE_URL}/create-tree`, {
          treeName: treeName,
          nodes: nodes,
          folderName: folderName,
          uploadDate: formatDateForAPI(convertToUTCDate(uploadDate)),
        }, {
          params: { db_path: dbPath }
        });

        onUpload(response.data);
        onClose();
        toast.success(t('fileUpload.treeCreatedSuccess'));
      } catch (error) {
        console.error("Failed to create tree:", error);
        toast.error(
          error.response?.data?.error || t('fileUpload.failedToCreateTree')
        );
      }
    }
  };

  const handleDownloadGuide = () => {
    const link = document.createElement("a");
    link.href = "/מדריך מפורט להעלאת נתונים.pdf";
    link.download = "be-net_file_upload_guide.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isUploadDisabled = !selectedFile || !uploadDate || !preselectedFolderId;
  const isBuildDisabled = !treeName || !uploadDate || !folderName;

  // No early return or internal AnimatePresence - parent handles exit animations

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay: 0.05 }}
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
                {/* Method Selection Tabs */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCreationMethod("upload")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                      creationMethod === "upload"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: creationMethod === "upload" ? THEME.primary : undefined
                    }}
                  >
                    <Upload size={16} />
                    {t('fileUpload.uploadFile')}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCreationMethod("build")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                      creationMethod === "build"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={{
                      backgroundColor: creationMethod === "build" ? THEME.primary : undefined
                    }}
                  >
                    <Edit3 size={16} />
                    {t('fileUpload.buildTree')}
                  </motion.button>
                </div>

                {/* File Upload Area - Only show if method is "upload" */}
                {creationMethod === "upload" && (
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
                )}

                {/* Build Tree Form - Only show if method is "build" */}
                {creationMethod === "build" && (
                  <>
                    {/* Tree Name */}
                    <div>
                      <motion.div
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        whileHover={{
                          borderColor: "#9CA3AF"
                        }}
                      >
                        <FileText size={18} className="text-gray-500 mr-2 rtl:mr-0 rtl:ml-2" />
                        <input
                          type="text"
                          value={treeName}
                          onChange={(e) => setTreeName(e.target.value)}
                          placeholder={t('createTree.treeNamePlaceholder')}
                          className="bg-transparent w-full outline-none text-sm"
                        />
                      </motion.div>
                    </div>

                    {/* Info Message */}
                    <div className="bg-white border border-gray-300 rounded-md p-3">
                      <p className="text-sm text-gray-900">
                        {t('createTree.emptyCanvasInfo')}
                      </p>
                    </div>
                  </>
                )}

                {/* Table Name (optional) - Only show for upload method */}
                {creationMethod === "upload" && (
                  <div>
                    <motion.div
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      whileHover={{
                        borderColor: "#9CA3AF"
                      }}
                    >
                      <FileText size={18} className="text-gray-500 mr-2 rtl:mr-0 rtl:ml-2" />
                      <input
                        type="text"
                        value={tableName}
                        onChange={handleTableNameChange}
                        placeholder={t('fileUpload.tableNameOptional')}
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

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  {creationMethod === "upload" ? (
                    <>
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
                    </>
                  ) : (
                    <motion.button
                      whileHover={!isBuildDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isBuildDisabled ? { scale: 0.98 } : {}}
                      onClick={handleBuildTree}
                      className={`flex-grow px-4 py-2.5 rounded-md text-white font-medium text-sm flex items-center justify-center gap-2 ${
                        isBuildDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-800"
                      }`}
                      style={{ backgroundColor: THEME.buttonColor }}
                      disabled={isBuildDisabled}
                    >
                      <Edit3 size={18} />
                      <span>{t('createTree.createTree')}</span>
                    </motion.button>
                  )}
                </div>
              </div>
      </motion.div>
    </motion.div>
  );
};

export default FileUploadModal;