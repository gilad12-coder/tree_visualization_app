import React, { useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'react-feather';
import { motion } from 'framer-motion';

const SearchBar = ({ onSearch, totalResults, currentResult, onNavigate, onClose, searchTerm, setSearchTerm, autoFocus }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e) => {
    const newTerm = e.target.value;
    setSearchTerm(newTerm);
    onSearch(newTerm);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNavigate('next');
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.1,
      boxShadow: '0 0 8px rgba(0, 0, 0, 0.2)',
    },
    tap: { 
      scale: 0.95 
    }
  };

  const CoolButton = ({ onClick, icon: Icon, label }) => (
    <motion.button
      onClick={onClick}
      className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 bg-blue-500 bg-opacity-30 hover:bg-opacity-40 text-black mx-0.5"
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      aria-label={label}
    >
      <Icon size={16} />
    </motion.button>
  );

  return (
    <motion.div 
      className="flex items-center bg-blue-500 bg-opacity-20 rounded-xl shadow-sm overflow-hidden"
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.3 }}
    >
      <input
        ref={inputRef}
        id="tree-search-input"
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Search tree..."
        className="py-2 px-3 bg-transparent focus:outline-none text-sm text-black placeholder-black placeholder-opacity-60 flex-grow"
        autoComplete="off"
      />
      {totalResults > 0 && searchTerm.trim() !== '' && (
        <div className="flex items-center px-2">
          <span className="text-sm text-black mr-2 font-medium">
            {currentResult}/{totalResults}
          </span>
          <CoolButton onClick={() => onNavigate('prev')} icon={ChevronUp} label="Previous result" />
          <CoolButton onClick={() => onNavigate('next')} icon={ChevronDown} label="Next result" />
        </div>
      )}
      <CoolButton onClick={onClose} icon={X} label="Close search" />
    </motion.div>
  );
};

export default SearchBar;