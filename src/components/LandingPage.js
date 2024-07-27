import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ChevronRight, Plus } from 'react-feather';
import { ReactComponent as OrgChartSVG } from '../assets/landing_page_image.svg';
import axios from 'axios';
import FileUploadModal from './FileUploadModal';

const API_BASE_URL = 'http://localhost:5000';

const MotionPath = motion.path;

const AnimatedLogo = () => (
  <svg width="60" height="60" viewBox="0 0 50 50">
    <MotionPath
      d="M25,10 L40,40 L10,40 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
    />
  </svg>
);

const LandingPage = ({ onDatabaseReady }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [folderPath, setFolderPath] = useState('');
  const [folderPathError, setFolderPathError] = useState('');
  const [dbPath, setDbPath] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleUploadNewDB = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('db_file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload_new_db`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDbPath(response.data.db_path);
      setStep(2);
    } catch (error) {
      console.error('Error uploading new DB:', error);
      alert('Error uploading new DB. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDB = async () => {
    if (!validateFolderPath()) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/create_new_db`, { 
        db_path: folderPath
      });
      if (response.data.error) {
        setFolderPathError(response.data.error);
      } else {
        setDbPath(response.data.db_path);
        setStep(2);
      }
    } catch (error) {
      console.error('Error creating new DB:', error);
      setFolderPathError('Error creating new DB. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (tableId, folderId, folderName, fileName, uploadDate) => {
    try {
      onDatabaseReady(dbPath, tableId);
    } catch (error) {
      console.error('Error after file upload:', error);
      alert('Error processing uploaded file. Please try again.');
    }
  };

  const handleFolderPathChange = (e) => {
    setFolderPath(e.target.value);
    setFolderPathError('');
  };

  const validateFolderPath = () => {
    if (!folderPath) {
      setFolderPathError('Please enter a folder path');
      return false;
    }
    if (!/^[a-zA-Z]:\\[\\\S|*\S]?.*$/.test(folderPath) && !folderPath.startsWith('/')) {
      setFolderPathError('Please enter a valid folder path');
      return false;
    }
    return true;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden backdrop-filter backdrop-blur-lg"
      >
        <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <AnimatedLogo />
            <h1 className="text-4xl font-black text-black tracking-tight">OrgChart Visualizer</h1>
          </div>
        </div>
        <div className="p-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-700"
            >
              Transform your organizational structure into an interactive, easy-to-understand visual chart.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500 bg-opacity-20 rounded-xl p-6 space-y-4"
            >
              <h2 className="text-2xl font-bold text-black">Visualize Your Organization</h2>
              <p className="text-gray-700">
                Whether you're a small startup or a large corporation, our OrgChart Visualizer helps you create clear, 
                interactive organizational charts that bring your company structure to life.
              </p>
            </motion.div>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.label
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center">
                      <Upload size={20} className="mr-2" />
                      <span className="font-bold">Upload Existing Database</span>
                    </span>
                    <ChevronRight size={20} />
                    <input
                      type="file"
                      accept=".db"
                      onChange={handleUploadNewDB}
                      className="hidden"
                    />
                  </motion.label>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1.5)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Plus size={20} className="mr-2" />
                      <span className="font-bold">Create New Database</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                </motion.div>
              )}
              {step === 1.5 && (
                <motion.div
                  key="step1.5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <input
                      type="text"
                      placeholder="Enter folder path"
                      value={folderPath}
                      onChange={handleFolderPathChange}
                      className="w-full bg-transparent outline-none"
                    />
                  </motion.div>
                  {folderPathError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-500 text-sm"
                    >
                      {folderPathError}
                    </motion.p>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateNewDB}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Plus size={20} className="mr-2" />
                      <span className="font-bold">Create Database</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight size={20} className="mr-2 transform rotate-180" />
                      <span className="font-bold">Back</span>
                    </span>
                  </motion.button>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Upload size={20} className="mr-2" />
                      <span className="font-bold">Upload First File</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(1)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight size={20} className="mr-2 transform rotate-180" />
                      <span className="font-bold">Back</span>
                    </span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="bg-blue-500 bg-opacity-20 rounded-xl p-6 flex items-center justify-center"
          >
            <OrgChartSVG className="w-full h-auto" />
          </motion.div>
        </div>
      </motion.div>
      
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadFile}
        dbPath={dbPath}
      />
    </div>
  );
};

export default LandingPage;