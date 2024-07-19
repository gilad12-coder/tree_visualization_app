// src/components/FileUploadModal.js
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload } from 'react-feather';

const FileUploadModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [folderName, setFolderName] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleFolderNameChange = (event) => {
    setFolderName(event.target.value);
  };

  const handleUpload = async () => {
    if (selectedFile && folderName) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder_name', folderName);

      try {
        await onUpload(formData);
        setSelectedFile(null);
        setFolderName('');
        onClose();
      } catch (error) {
        console.error('Failed to upload file:', error);
        // Handle error (e.g., show error message to user)
      }
    }
  };

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Upload File</h2>
                <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={folderName}
                onChange={handleFolderNameChange}
                placeholder="Enter folder name"
                className="w-full p-2 mb-4 border border-gray-300 rounded"
              />
              <input
                type="file"
                onChange={handleFileChange}
                className="w-full mb-4"
              />
              <button
                onClick={handleUpload}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                disabled={!selectedFile || !folderName}
              >
                <Upload size={20} className="mr-2" />
                Upload
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FileUploadModal;