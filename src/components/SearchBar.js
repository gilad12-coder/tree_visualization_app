import React, { useState } from 'react';
import { Search } from 'react-feather';

const SearchBar = ({ onSearch, totalResults, currentResult, onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className="flex items-center space-x-2 bg-white rounded-md shadow-sm">
      <form onSubmit={handleSubmit} className="flex-grow flex items-center">
        <input
          id="tree-search-input"  // This is the change for step 2
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search tree..."
          className="w-full p-2 rounded-l-md focus:outline-none"
        />
        <button type="submit" className="p-2">
          <Search size={20} />
        </button>
      </form>
      {totalResults > 0 && searchTerm.trim() !== '' && (
        <div className="flex items-center space-x-2 pr-2">
          <span className="text-sm">{currentResult} of {totalResults}</span>
          <button onClick={() => onNavigate('prev')} className="p-1">&#9650;</button>
          <button onClick={() => onNavigate('next')} className="p-1">&#9660;</button>
        </div>
      )}
    </div>
  );
};

export default SearchBar;