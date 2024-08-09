import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Trash2,
  Filter,
  ChevronDown,
  Calendar,
  Briefcase,
  User,
  Hash,
  Award,
  UserCheck,
  Lock,
  Unlock,
  Search,
  Eye,
} from "react-feather";
import { extractAllData } from "../Utilities/orgChartUtils";
import Button from "./Button";
import axios from "axios";

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
  onClearSearch,
  activeFilters,
  orgData,
  folderId,
  tableId,
}) => {
  const [selectedType, setSelectedType] = useState(null);
  const [filters, setFilters] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTab] = useState("filter");
  const [searchResults, setSearchResults] = useState(null);
  const [searchColumn, setSearchColumn] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const allData = useMemo(() => extractAllData(orgData), [orgData]);

  const filterTypes = [
    { key: "birth_date", label: "Birth Date", Icon: Calendar },
    { key: "department", label: "Department", Icon: Briefcase },
    { key: "name", label: "Name", Icon: User },
    { key: "organization_id", label: "Organization", Icon: Briefcase },
    { key: "person_id", label: "Person ID", Icon: Hash },
    { key: "rank", label: "Rank", Icon: Award },
    { key: "role", label: "Role", Icon: UserCheck },
  ];

  useEffect(() => {
    const initialFilters = {};
    activeFilters.forEach((filter) => {
      initialFilters[filter.type] = filter.value ? filter.value.split(",") : [];
    });
    setFilters(initialFilters);
  }, [activeFilters]);

  const handleInputChange = (type, value) => {
    setFilters((prev) => {
      const updatedValues = prev[type] ? [...prev[type]] : [];
      const valueIndex = updatedValues.indexOf(value);
      if (valueIndex === -1) {
        updatedValues.push(value);
      } else {
        updatedValues.splice(valueIndex, 1);
      }
      return { ...prev, [type]: updatedValues };
    });
  };

  const handleClearAllFilters = () => {
    setFilters({});
    setSelectedType(null);
    setSearchInput("");
    setIsLocked(false);
    setSearchResults(null);
    setSearchColumn("");
    onClearSearch();
  };

  const handleApply = async () => {
    if (activeTab === "filter") {
      const appliedFilters = Object.entries(filters)
        .filter(([_, value]) => value.length > 0)
        .map(([type, value]) => ({ type, value: value.join(",") }));
      onApplyFilters(appliedFilters);
      onClose();
    } else {
      await performSearch();
    }
  };

  const performSearch = async () => {
    if (!searchColumn || !searchInput) return;
    setIsSearching(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/search/${folderId}/${tableId}`,
        {
          params: {
            query: searchInput,
            column: searchColumn,
          },
        }
      );
      setSearchResults(response.data.results);
    } catch (error) {
      console.error("Error performing search:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewResults = () => {
    onSearch(searchResults);
    onClose();
  };

  const filteredOptions = useMemo(() => {
    if (!selectedType) return [];
    return allData[`${selectedType}s`]?.filter(
      (item) =>
        item &&
        item.toString().toLowerCase().includes(searchInput.toLowerCase())
    ) || [];
  }, [allData, selectedType, searchInput]);

  const SelectedTypeIcon = selectedType
    ? filterTypes.find((ft) => ft.key === selectedType)?.Icon
    : null;

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    if (newType) {
      setSelectedType(newType);
      setIsLocked(true);
    } else {
      setSelectedType(null);
      setIsLocked(false);
    }
    setSearchInput("");
  };

  const handleSearchColumnChange = (e) => {
    const newColumn = e.target.value;
    if (newColumn) {
      setSearchColumn(newColumn);
      setIsLocked(true);
    } else {
      setSearchColumn("");
      setIsLocked(false);
    }
    setSearchInput("");
  };

  const handleLockToggle = () => {
    if (isLocked) {
      setSelectedType(null);
      setSearchColumn("");
      setSearchInput("");
    }
    setIsLocked(!isLocked);
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
            className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden backdrop-filter backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <AnimatedLogo />
                  <h2 className="text-2xl font-black text-black tracking-tight">
                    {activeTab === "filter" ? "Filter" : "Search"} Org Chart
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
              <div className="flex space-x-2">
                <motion.button
                  onClick={() => setActiveTab("filter")}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    activeTab === "filter"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  } font-bold tracking-wide`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Filter
                </motion.button>
                <motion.button
                  onClick={() => setActiveTab("search")}
                  className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                    activeTab === "search"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  } font-bold tracking-wide`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Search
                </motion.button>
              </div>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="mb-4 flex space-x-2">
                <div className="flex-grow relative">
                  <select
                    value={
                      activeTab === "filter"
                        ? selectedType || ""
                        : searchColumn || ""
                    }
                    onChange={
                      activeTab === "filter"
                        ? handleTypeChange
                        : handleSearchColumnChange
                    }
                    disabled={isLocked}
                    className="w-full appearance-none bg-blue-100 bg-opacity-50 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                  >
                    <option value="">
                      {activeTab === "filter"
                        ? "Select filter type"
                        : "Select column to search"}
                    </option>
                    {filterTypes.map(({ key, label }) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <ChevronDown size={18} className="text-gray-500" />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLockToggle}
                  disabled={!selectedType && !searchColumn}
                  className={`p-3 rounded-xl ${
                    isLocked ? "bg-blue-500" : "bg-gray-200"
                  } ${
                    selectedType || searchColumn
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  } transition-colors duration-200`}
                >
                  <motion.div
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: isLocked ? 180 : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {isLocked ? (
                      <Lock size={24} className="text-white" />
                    ) : (
                      <Unlock size={24} className="text-gray-600" />
                    )}
                  </motion.div>
                </motion.button>
              </div>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={
                      activeTab === "filter"
                        ? `Search ${selectedType?.replace("_", " ")}...`
                        : "For example: 'manager' + 'tech' or 'chief'"
                    }
                    className="w-full bg-blue-100 bg-opacity-50 rounded-xl py-3 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    {activeTab === "filter" && SelectedTypeIcon && (
                      <SelectedTypeIcon size={18} className="text-blue-500" />
                    )}
                    {activeTab === "search" && (
                      <Search size={18} className="text-blue-500" />
                    )}
                  </div>
                </div>
              </div>
              {activeTab === "filter" && selectedType && (
                <div className="mt-2 bg-blue-100 bg-opacity-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {filteredOptions.map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center p-2 hover:bg-blue-200 hover:bg-opacity-50 cursor-pointer rounded-lg"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInputChange(selectedType, item)}
                    >
                      <input
                        type="checkbox"
                        checked={filters[selectedType]?.includes(item)}
                        onChange={() => {}}
                        className="mr-2"
                      />
                      <span className="text-black font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              {activeTab === "search" && searchResults !== null && (
                <div className="mt-2 bg-blue-100 bg-opacity-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, index) => (
                      <div
                        key={index}
                        className="mb-2 p-2 bg-white bg-opacity-50 rounded-lg"
                      >
                        <p className="font-medium">
                          <strong>Name:</strong> {result.name}
                        </p>
                        <p>
                          <strong>Role:</strong> {result.role}
                        </p>
                        <p>
                          <strong>Department:</strong> {result.department || "N/A"}
                        </p>
                        <p>
                          <strong>Matched Terms:</strong>{" "}
                          {result.matched_terms.join(", ")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No results found</p>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "filter" && (
                <div className="mt-4">
                  <h3 className="font-semibold text-lg text-black mb-2">
                    Active Filters:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(filters).map(([type, values]) =>
                      values.map((value, index) => (
                        <motion.div
                          key={`${type}-${index}`}
                          className="bg-blue-500 bg-opacity-20 rounded-full px-3 py-1 flex items-center space-x-2"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className="text-sm font-medium text-black capitalize">
                            {type.replace("_", " ")}: {value}
                          </span>
                          <button
                            onClick={() => handleInputChange(type, value)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))
                    )}
                    {Object.keys(filters).length === 0 && (
                      <p className="text-gray-500 text-sm italic">
                        No active filters
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-6">
                <Button
                  onClick={handleClearAllFilters}
                  icon={Trash2}
                  variant="danger"
                >
                  Clear All
                </Button>
                {activeTab === "filter" ? (
                  <Button
                    onClick={handleApply}
                    icon={Filter}
                    variant="primary"
                  >
                    Apply Filters
                  </Button>
                ) : (
                  <>
                    {searchResults === null ? (
                      <Button
                        onClick={performSearch}
                        icon={Search}
                        variant="primary"
                        disabled={!searchColumn || !searchInput || isSearching}
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleViewResults}
                        icon={Eye}
                        variant="primary"
                      >
                        View Results
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;