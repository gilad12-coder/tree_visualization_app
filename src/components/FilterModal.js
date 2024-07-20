import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Search, Trash2, Filter } from 'react-feather';
import { extractNamesAndRoles } from '../Utilities/orgChartUtils';

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

const FilterModal = ({ isOpen, onClose, onApplyFilters, activeFilters, orgData }) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedFilters, setSelectedFilters] = useState(activeFilters);

  const bgOpacity = useMotionValue(0);
  const bgBlur = useTransform(bgOpacity, [0, 1], [0, 10]);

  const allNames = useMemo(() => {
    if (orgData && typeof orgData === 'object') {
      const { names } = extractNamesAndRoles(orgData);
      return names;
    }
    return [];
  }, [orgData]);

  const filteredNames = useMemo(() => {
    if (searchInput.trim() === '') return allNames;
    return allNames.filter(name => 
      name.toLowerCase().includes(searchInput.toLowerCase())
    );
  }, [allNames, searchInput]);

  useEffect(() => {
    setSelectedFilters(activeFilters);
  }, [activeFilters]);

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  const handleNameToggle = (name) => {
    setSelectedFilters(prev => 
      prev.includes(name) 
        ? prev.filter(f => f !== name)
        : [...prev, name]
    );
  };

  const handleClearAllFilters = () => {
    setSelectedFilters([]);
    setSearchInput('');
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
          className="fixed inset-0 flex justify-center items-center z-50 p-8"
          onClick={onClose}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${bgOpacity.get()})`,
            backdropFilter: `blur(${bgBlur.get()}px)`,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden backdrop-filter backdrop-blur-lg"
            onClick={(e) => e.stopPropagation()}
            onAnimationComplete={() => bgOpacity.set(0.5)}
          >
            <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <AnimatedLogo />
                  <h2 className="text-3xl font-black text-black tracking-tight">Filter Org Chart</h2>
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
            <div className="p-8 space-y-6">
              <motion.div 
                className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4 flex items-center space-x-3"
                whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
              >
                <Search size={20} className="text-black" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  placeholder="Search names"
                  className="bg-transparent w-full outline-none text-sm text-black placeholder-gray-500"
                />
              </motion.div>
              <div className="bg-blue-500 bg-opacity-20 rounded-xl p-4 max-h-60 overflow-y-auto">
                {filteredNames.map((name, index) => (
                  <motion.label
                    key={index}
                    className="flex items-center p-2 hover:bg-blue-600 hover:bg-opacity-20 cursor-pointer rounded-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFilters.includes(name)}
                      onChange={() => handleNameToggle(name)}
                      className="mr-2"
                    />
                    <span className="text-black">{name}</span>
                  </motion.label>
                ))}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg text-black">Selected Filters:</h3>
                  <motion.button
                    onClick={handleClearAllFilters}
                    className="px-3 py-1 bg-red-500 bg-opacity-20 text-red-600 rounded-full hover:bg-opacity-30 transition-colors flex items-center space-x-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 size={14} />
                    <span className="text-sm font-medium">Clear All</span>
                  </motion.button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFilters.map((filter, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center p-2 bg-blue-500 bg-opacity-20 text-black rounded-full"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="mr-1">{filter}</span>
                      <button
                        onClick={() => handleNameToggle(filter)}
                        className="text-black hover:text-gray-700 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.button
                onClick={handleApply}
                className="w-full px-4 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
              >
                <Filter size={20} />
                <span className="font-bold">Apply Filters</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterModal;