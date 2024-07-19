// src/components/FilterModal.js
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X} from 'react-feather';
import { extractNamesAndRoles } from '../utils/orgChartUtils';

const FilterModal = ({ isOpen, onClose, onApplyFilters, activeFilters, orgData }) => {
  const [filterType, setFilterType] = useState('name'); // 'name' or 'role'
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState(activeFilters);

  const allOptions = useMemo(() => {
    if (orgData && typeof orgData === 'object') {
      const { names, roles } = extractNamesAndRoles(orgData);
      return { names, roles };
    }
    return { names: [], roles: [] };
  }, [orgData]);

  const filteredOptions = useMemo(() => {
    const options = allOptions[filterType === 'name' ? 'names' : 'roles'];
    if (searchInput.trim() === '') return options;
    return options.filter(option => 
      option.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [allOptions, filterType, searchInput]);

  useEffect(() => {
    setSelectedFilters(activeFilters);
  }, [activeFilters]);

  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    setSearchInput('');
    setIsDropdownOpen(true);
  };

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleOptionToggle = (option) => {
    setSelectedFilters(prev => 
      prev.includes(option) 
        ? prev.filter(f => f !== option)
        : [...prev, option]
    );
  };

  const handleAddCustomOption = () => {
    if (searchInput.trim() && !selectedFilters.includes(searchInput.trim())) {
      setSelectedFilters(prev => [...prev, searchInput.trim()]);
      setSearchInput('');
    }
  };

  const handleApply = () => {
    onApplyFilters(selectedFilters);
    onClose();
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-blue-500 to-purple-600">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Filter Org Chart</h2>
                <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-700">Filter by:</h3>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleFilterTypeChange('name')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterType === 'name' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Name
                  </button>
                  <button
                    onClick={() => handleFilterTypeChange('role')}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filterType === 'role' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Role
                  </button>
                </div>
              </div>
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder={`Search or add ${filterType}`}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  onClick={handleAddCustomOption}
                  className="absolute right-2 top-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
              {isDropdownOpen && (
                <div className="mb-4 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredOptions.map((option, index) => (
                    <label key={index} className="flex items-center p-3 hover:bg-gray-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFilters.includes(option)}
                        onChange={() => handleOptionToggle(option)}
                        className="mr-2"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              )}
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-700">Selected Filters:</h3>
                <ul className="space-y-2">
                  {selectedFilters.map((filter, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                      <span className="text-gray-800">{filter}</span>
                      <button
                        onClick={() => handleOptionToggle(filter)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={handleApply}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;