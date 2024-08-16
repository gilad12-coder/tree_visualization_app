import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  ChevronDown,
  Briefcase,
  User,
  Hash,
  Award,
  UserCheck,
  Search,
  Check,
  Eye,
} from "react-feather";
import Button from "./Button";
import axios from "axios";
import { toast } from 'react-toastify';

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

const FilterModal = ({
  isOpen,
  onClose,
  onApplyFilters,
  onSearch,
  folderId,
  tableId,
  resetTrigger,
}) => {
  const [selectedColumn, setSelectedColumn] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const columnTypes = [
    { key: "department", label: "Department", Icon: Briefcase },
    { key: "name", label: "Name", Icon: User },
    { key: "organization_id", label: "Organization", Icon: Briefcase },
    { key: "person_id", label: "Person ID", Icon: Hash },
    { key: "rank", label: "Rank", Icon: Award },
    { key: "role", label: "Role", Icon: UserCheck },
  ];

  const fetchResults = useCallback(async (query = "") => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/search/${folderId}/${tableId}`,
        {
          params: {
            query: query,
            column: selectedColumn,
          },
        }
      );
      setResults(response.data.results);
    } catch (error) {
      console.error("Error fetching results:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [folderId, tableId, selectedColumn]);

  useEffect(() => {
    const resetModal = () => {
      setSelectedColumn("");
      setSearchInput("");
      setResults([]);
      setSelectedResults([]);
      setIsLoading(false);
    };

    if (resetTrigger) {
      resetModal();
    }
  }, [resetTrigger]);

  useEffect(() => {
    if (selectedColumn) {
      fetchResults();
    }
  }, [selectedColumn, fetchResults]);

  const handleColumnChange = (e) => {
    setSelectedColumn(e.target.value);
    setSearchInput("");
    setSelectedResults([]);
  };

  const handleSearch = () => {
    fetchResults(searchInput);
  };

  const handleClearAll = () => {
    setSelectedResults([]);
  };

  const handleSelectAll = () => {
    setSelectedResults(results.map((result) => result.person_id));
  };

  const toggleResultSelection = (personId) => {
    setSelectedResults((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const handleViewResults = () => {
    if (selectedResults.length === 0) {
      toast.warn('Select results first', { autoClose: 2000 });
      return;
    }
    const selectedResultsData = results.filter((result) =>
      selectedResults.includes(result.person_id)
    );
    onSearch(selectedResultsData);
    onClose();
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
      <div className="grid grid-cols-2 gap-4">
        {results.map((result, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`p-3 bg-white bg-opacity-70 rounded-lg shadow-md cursor-pointer ${
              selectedResults.includes(result.person_id) ? "ring-2 ring-blue-500" : ""
            }`}
            onClick={() => toggleResultSelection(result.person_id)}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{result.name}</h3>
              {selectedResults.includes(result.person_id) && (
                <Check size={20} className="text-blue-500" />
              )}
            </div>
            <p className="text-sm mb-1">
              <strong>Role:</strong> {result.role}
            </p>
            <p className="text-sm mb-1">
              <strong>Department:</strong> {result.department || "N/A"}
            </p>
            <p className="text-sm mb-1">
              <strong>Rank:</strong> {result.rank || "N/A"}
            </p>
            {selectedColumn !== "name" &&
              selectedColumn !== "role" &&
              selectedColumn !== "department" &&
              selectedColumn !== "rank" && (
                <p className="text-sm mb-1">
                  <strong>
                    {columnTypes.find((ct) => ct.key === selectedColumn)
                      ?.label || selectedColumn}
                    :
                  </strong>{" "}
                  {result[selectedColumn] || "N/A"}
                </p>
              )}
            {result.matched_terms && result.matched_terms.length > 0 && (
              <div className="mt-2 text-center">
                <strong className="text-sm">Matched Terms:</strong>
                <div className="flex flex-wrap justify-center mt-1">
                  {result.matched_terms.map((term, i) => (
                    <span
                      key={i}
                      className="inline-block bg-yellow-200 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 m-1"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
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
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-4">
                <div className="relative">
                  <select
                    value={selectedColumn || ""}
                    onChange={handleColumnChange}
                    className="w-full appearance-none bg-blue-100 bg-opacity-50 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                  >
                    <option value="">Select column to search</option>
                    {columnTypes.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    {selectedColumn && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {React.createElement(
                          columnTypes.find((ct) => ct.key === selectedColumn)?.Icon || ChevronDown,
                          { size: 18, className: "text-blue-500" }
                        )}
                      </motion.div>
                    )}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown size={18} className="text-gray-500" />
                  </div>
                </div>
              </div>
  
              {selectedColumn && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`Search ${selectedColumn.replace("_", " ")}...`}
                        className="w-full bg-blue-100 bg-opacity-50 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search size={18} className="text-blue-500" />
                      </div>
                    </div>
                  </div>
  
                  <div className="mt-2 bg-blue-100 bg-opacity-50 rounded-xl p-3 max-h-96 overflow-y-auto mb-6">
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
                        onClick={handleSearch}
                        icon={Search}
                        variant="primary"
                        disabled={!selectedColumn || isLoading}
                      >
                        {isLoading ? "Searching..." : "Search"}
                      </Button>
                      <Button
                        onClick={handleViewResults}
                        icon={Eye}
                        variant="primary"
                      >
                        View Results
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;