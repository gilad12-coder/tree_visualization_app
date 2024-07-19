import { useState, useCallback, useEffect } from 'react';
import { searchPerson } from '../utils/searchUtils';

export const useSearch = (orgData, onNodeFound) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term.length > 0) {
      const results = searchPerson(orgData, term);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [orgData]);

  const handleSelectPerson = useCallback((node) => {
    onNodeFound(node);
    closeSearch();
  }, [onNodeFound, closeSearch]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        openSearch();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [openSearch]);

  return {
    isSearchOpen,
    searchTerm,
    searchResults,
    openSearch,
    closeSearch,
    handleSearch,
    handleSelectPerson
  };
};