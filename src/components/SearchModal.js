// src/components/SearchModal.js
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'react-feather';

const SearchModal = ({ isOpen, onClose, searchTerm, onSearch, searchResults, onSelectPerson }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md mt-20 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b">
              <div className="flex items-center">
                <Search className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search for a person..."
                  className="w-full outline-none text-lg"
                  value={searchTerm}
                  onChange={(e) => onSearch(e.target.value)}
                  autoFocus
                />
                <button onClick={onClose} className="ml-2">
                  <X className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </div>
            {searchResults.length > 0 && (
              <ul className="max-h-64 overflow-y-auto">
                {searchResults.map((person) => (
                  <li
                    key={person.id}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => onSelectPerson(person)}
                  >
                    <div className="font-semibold">{person.name}</div>
                    <div className="text-sm text-gray-600">{person.role}</div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;