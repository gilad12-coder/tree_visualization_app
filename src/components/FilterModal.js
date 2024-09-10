import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  Check,
  Eye,
  ChevronDown,
  Briefcase,
  User,
  Hash,
  Award,
  UserCheck,
  Search,
} from "react-feather";
import Button from "./Button";
import axios from "axios";
import { toast } from "react-toastify";
import ResultCard from "./ResultCard.js";
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

const columnTypes = [
  { key: "department", label: "Department", Icon: Briefcase },
  { key: "name", label: "Name", Icon: User },
  { key: "organization_id", label: "Organization", Icon: Briefcase },
  { key: "person_id", label: "Person ID", Icon: Hash },
  { key: "rank", label: "Rank", Icon: Award },
  { key: "role", label: "Role", Icon: UserCheck },
];

const FilterModal = ({
  isOpen,
  onClose,
  onSearch,
  folderId,
  tableId,
  resetTrigger,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResultsFetched, setIsResultsFetched] = useState(false);
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);

  const fetchResults = useCallback(
    async (query = "", columns = []) => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:5000/search/${folderId}/${tableId}`,
          {
            params: {
              query: query,
              columns: columns.join(","),
            },
          }
        );
        setResults(response.data.results);
        setIsResultsFetched(true);
      } catch (error) {
        console.error("Error fetching results:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [folderId, tableId]
  );

  useEffect(() => {
    if (isOpen) {
      fetchResults("");
    }
  }, [isOpen, fetchResults]);

  useEffect(() => {
    const resetModal = () => {
      setSearchInput("");
      setResults([]);
      setSelectedResults([]);
      setIsLoading(false);
      setIsResultsFetched(false);
      setShowColumnSelection(false);
      setSelectedColumns([]);
    };

    if (resetTrigger) {
      resetModal();
    }
  }, [resetTrigger]);

  const handleSearch = () => {
    fetchResults(searchInput, selectedColumns);
  };

  const handleClearAll = () => {
    setSelectedResults([]);
  };

  const handleSelectAll = () => {
    setSelectedResults(results.map((result) => result.hierarchical_structure));
  };

  const toggleResultSelection = (hierarchicalStructure) => {
    setSelectedResults((prev) =>
      prev.includes(hierarchicalStructure)
        ? prev.filter((id) => id !== hierarchicalStructure)
        : [...prev, hierarchicalStructure]
    );
  };

  const handleViewResults = () => {
    if (selectedResults.length === 0) {
      toast.warn("Select results first", { autoClose: 2000 });
      return;
    }
    const selectedResultsData = results.filter((result) =>
      selectedResults.includes(result.hierarchical_structure)
    );
    onSearch(selectedResultsData);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleColumnSelection = (column) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const renderResults = () => {
    if (results.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-500">No results found</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((result) => (
          <ResultCard
            key={result.hierarchical_structure}
            result={result}
            isSelected={selectedResults.includes(result.hierarchical_structure)}
            onSelect={toggleResultSelection}
          />
        ))}
      </div>
    );
  };

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: { duration: 0.2, ease: "easeInOut" },
    },
  };

  if (!isOpen || !isResultsFetched) {
    return null;
  }

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
          className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden backdrop-filter backdrop-blur-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <AnimatedLogo />
                <h2 className="text-3xl font-black text-black tracking-tight">
                  Search Org Chart
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
          <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-blue-100 bg-opacity-50 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search size={18} className="text-blue-500" />
                </div>
              </div>
              <div className="relative">
                <Button
                  onClick={() => setShowColumnSelection(!showColumnSelection)}
                  icon={ChevronDown}
                  variant={selectedColumns.length > 0 ? "active" : "primary"}
                >
                  {selectedColumns.length > 0
                    ? `Columns (${selectedColumns.length})`
                    : "Columns"}
                </Button>
                <AnimatePresence>
                  {showColumnSelection && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={dropdownVariants}
                      className="absolute z-10 right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 overflow-hidden"
                    >
                      <motion.div
                        className="py-1 max-h-60 overflow-y-auto custom-scrollbar"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="options-menu"
                      >
                        {columnTypes.map(({ key, label, Icon }) => (
                          <motion.label
                            key={key}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedColumns.includes(key)}
                                onChange={() => toggleColumnSelection(key)}
                                className="opacity-0 absolute h-5 w-5 cursor-pointer"
                              />
                              <div
                                className={`border-2 rounded-md w-5 h-5 flex flex-shrink-0 justify-center items-center mr-2 ${
                                  selectedColumns.includes(key)
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                <Check
                                  size={14}
                                  className={`text-white ${
                                    selectedColumns.includes(key)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                              </div>
                            </div>
                            <Icon size={16} className="mr-2" />
                            <span className="truncate">{label}</span>
                          </motion.label>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-2 bg-blue-100 bg-opacity-50 rounded-xl p-3 max-h-96 overflow-y-auto custom-scrollbar mb-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading results...</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-3 p-2 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <span className="font-semibold text-blue-800">
                        Total Results:
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {results.length}
                    </span>
                  </motion.div>
                  {renderResults()}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No results found</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-4 space-x-4">
              <div className="flex space-x-2">
                <Button
                  onClick={handleClearAll}
                  icon={Trash2}
                  variant="danger"
                >
                  Clear All
                </Button>
                <Button
                  onClick={handleSelectAll}
                  icon={Check}
                  variant="secondary"
                >
                  Select All
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleViewResults}
                  icon={Eye}
                  variant="primary"
                >
                  View Results
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FilterModal;