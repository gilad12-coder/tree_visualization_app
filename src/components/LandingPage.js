import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ChevronRight,
  List,
  Database,
  FolderPlus,
  Info,
  Clock,
} from "react-feather";
import { ReactComponent as OrgChartSVG } from "../assets/landing_page_image.svg";
import axios from "axios";
import FileUploadModal from "./FileUploadModal";
import TableSelectionModal from "./TableSelectionModal";
import {
  ExistingDatabaseSection,
  NewDatabaseSection,
} from "../components/DatabaseSelection";

const API_BASE_URL = "http://localhost:5000";

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

const StatusMonitor = ({ status }) => {
  return (
    <div className="w-full h-8 bg-gray-800 rounded-lg overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
      >
        <path
          d={status ? "M0,10 Q25,5 50,10 T100,10" : "M0,10 L100,10"}
          fill="none"
          stroke={status ? "#4CAF50" : "#FF5252"}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        >
          {status && (
            <animate
              attributeName="d"
              values="M0,10 Q25,5 50,10 T100,10;M0,10 Q25,15 50,10 T100,10;M0,10 Q25,5 50,10 T100,10"
              dur="4s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </svg>
    </div>
  );
};

const InfoIcon = ({ text }) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative inline-block">
      <motion.div
        onHoverStart={() => setShowInfo(true)}
        onHoverEnd={() => setShowInfo(false)}
        className="cursor-pointer"
      >
        <Info size={16} className="text-blue-500" />
      </motion.div>
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 p-2 bg-white rounded-md shadow-md text-sm text-gray-600 w-48 z-10"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LandingPage = ({ onDatabaseReady, currentDbPath }) => {
  const [step, setStep] = useState("initial");
  const [isLoading, setIsLoading] = useState(false);
  const [dbPath, setDbPath] = useState(currentDbPath);
  const [recentDbPath, setRecentDbPath] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);

  useEffect(() => {
    const storedRecentDbPath = localStorage.getItem("recentDbPath");
    if (storedRecentDbPath) {
      setRecentDbPath(storedRecentDbPath);
    }
  }, []);

  const fetchFolderStructure = useCallback(async (path) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/folder_structure`, {
        params: { db_path: path },
      });
      console.log("Folder structure response:", response.data);
      setFolderStructure(response.data);
    } catch (error) {
      console.error("Error fetching folder structure:", error);
      setFolderStructure([]);
    }
  }, []);

  const fetchDbInfo = useCallback(async () => {
    if (!dbPath) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/check_existing_db`, {
        db_path: dbPath,
      });
      console.log("Database check response:", response.data);
      if (response.data.exists) {
        setDbInfo({
          path: response.data.path,
          exists: true,
          hasData: response.data.hasData,
        });
        if (response.data.hasData) {
          await fetchFolderStructure(response.data.path);
          setStep("ready");
        } else {
          setStep("upload");
        }
        localStorage.setItem("recentDbPath", response.data.path);
        setRecentDbPath(response.data.path);
      } else {
        setDbInfo(null);
        setFolderStructure([]);
      }
    } catch (error) {
      console.error("Error fetching database info:", error);
      setDbInfo(null);
      setFolderStructure([]);
    } finally {
      setIsLoading(false);
    }
  }, [dbPath, fetchFolderStructure]);

  useEffect(() => {
    fetchDbInfo();
  }, [fetchDbInfo]);

  const handleUseExistingDB = async (existingDbPath) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/check_existing_db`, {
        db_path: existingDbPath,
      });
      console.log("Use existing DB response:", response.data);
      setDbPath(response.data.path);
      await fetchDbInfo();
    } catch (error) {
      console.error("Error checking existing DB:", error);
      alert("Error checking existing DB. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewDB = async (folderPath) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/create_new_db`, {
        db_path: folderPath,
      });
      console.log("Create new DB response:", response.data);
      if (response.data.error) {
        alert(response.data.error);
      } else {
        setDbPath(response.data.db_path);
        setStep("upload");
      }
    } catch (error) {
      console.error("Error creating new DB:", error);
      alert("Error creating new DB. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async (uploadedData) => {
    try {
      console.log("File uploaded:", uploadedData);
      await fetchDbInfo();
      onDatabaseReady(dbPath, uploadedData.table_id, uploadedData.folder_id);
    } catch (error) {
      console.error("Error after file upload:", error);
      alert("Error processing uploaded file. Please try again.");
    }
  };

  const handleTableSelection = async (tableId, folderId) => {
    try {
      console.log("Table selected:", { tableId, folderId });
      onDatabaseReady(dbPath, tableId, folderId);
    } catch (error) {
      console.error("Error after table selection:", error);
      alert("Error processing table selection. Please try again.");
    }
  };

  const handleOpenTableSelection = () => {
    console.log("Opening table selection modal with folder structure:", folderStructure);
    setIsTableSelectionOpen(true);
  };

  const handleUseRecentDB = async () => {
    if (recentDbPath) {
      await handleUseExistingDB(recentDbPath);
    }
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
            <h1 className="text-4xl font-black text-black tracking-tight">
              OrgChart Visualizer
            </h1>
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
              Transform your organizational structure into an interactive,
              easy-to-understand visual chart.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500 bg-opacity-20 rounded-xl p-6 space-y-4"
            >
              <h2 className="text-2xl font-bold text-black">
                Visualize Your Organization
              </h2>
              <p className="text-gray-700">
                Whether you're a small startup or a large corporation, our
                OrgChart Visualizer helps you create clear, interactive
                organizational charts that bring your company structure to life.
              </p>
            </motion.div>
            {dbPath && dbInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-blue-100 rounded-lg overflow-hidden"
              >
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-green-600 mb-2">
                    Current Database
                  </h3>
                  <p className="text-sm text-green-600 mb-2">
                    Path: {dbInfo.path}
                  </p>
                </div>
                <StatusMonitor status={dbInfo.exists} />
                <div className="p-4">
                  <p className="text-sm text-green-600 mb-2">
                    Status: {dbInfo.exists ? "Connected" : "Disconnected"}
                  </p>
                </div>
              </motion.div>
            )}
            <AnimatePresence mode="wait">
              {step === "initial" && (
                <motion.div
                  key="initial"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  {recentDbPath && (
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUseRecentDB}
                        className="flex-grow px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center">
                          <Clock size={20} className="mr-2" />
                          <span className="font-bold">Use Recent Database</span>
                        </span>
                        <ChevronRight size={20} />
                      </motion.button>
                      <InfoIcon text="Connect to your most recently used database." />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep("existing")}
                      className="flex-grow px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <Database size={20} className="mr-2" />
                        <span className="font-bold">Use Existing Database</span>
                      </span>
                      <ChevronRight size={20} />
                    </motion.button>
                    <InfoIcon text="Select this option if you already have a database file (.db) that you want to use." />
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStep("new")}
                      className="flex-grow px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center">
                        <FolderPlus size={20} className="mr-2" />
                        <span className="font-bold">Create New Database</span>
                      </span>
                      <ChevronRight size={20} />
                    </motion.button>
                    <InfoIcon text="Choose this option to create a new database in a specified folder." />
                  </div>
                </motion.div>
              )}
              {step === "existing" && (
                <motion.div
                  key="existing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <ExistingDatabaseSection
                    onUseExistingDB={handleUseExistingDB}
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("initial")}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight
                        size={20}
                        className="mr-2 transform rotate-180"
                      />
                      <span className="font-bold">Back</span>
                    </span>
                  </motion.button>
                </motion.div>
              )}
              {step === "new" && (
                <motion.div
                  key="new"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <NewDatabaseSection onCreateNewDB={handleCreateNewDB} />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("initial")}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight
                        size={20}
                        className="mr-2 transform rotate-180"
                      />
                      <span className="font-bold">Back</span>
                    </span>
                  </motion.button>
                </motion.div>
              )}
              {step === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Upload size={20} className="mr-2" />
                      <span className="font-bold">Upload First File</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("initial")}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight
                        size={20}
                        className="mr-2 transform rotate-180"
                      />
                      <span className="font-bold">Back</span>
                    </span>
                  </motion.button>
                </motion.div>
              )}
              {step === "ready" && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOpenTableSelection}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <List size={20} className="mr-2" />
                      <span className="font-bold">View Current Tables</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsUploadModalOpen(true)}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <Upload size={20} className="mr-2" />
                      <span className="font-bold">Upload New File</span>
                    </span>
                    <ChevronRight size={20} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setStep("initial")}
                    className="w-full px-6 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center">
                      <ChevronRight
                        size={20}
                        className="mr-2 transform rotate-180"
                      />
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
      <TableSelectionModal
        isOpen={isTableSelectionOpen}
        onClose={() => setIsTableSelectionOpen(false)}
        onSelectTable={handleTableSelection}
        folderStructure={folderStructure}
      />
    </div>
  );
};

export default LandingPage;