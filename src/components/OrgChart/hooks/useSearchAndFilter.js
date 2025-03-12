import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const useSearchAndFilter = (
  API_BASE_URL,
  selectedFolderId,
  selectedTableId,
  orgData,
  setFilteredOrgData,
  setExpandAll,
  setIsOrganizationMode
) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [filteredSearchResults, setFilteredSearchResults] = useState([]);
  const [filterModalResetTrigger, setFilterModalResetTrigger] = useState(0);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [treeSearchResults, setTreeSearchResults] = useState([]);
  const [currentTreeSearchIndex, setCurrentTreeSearchIndex] = useState(0);
  const [preFilterOrgData, setPreFilterOrgData] = useState(null);

  const handleSearch = useCallback((results) => {
    const resultStructures = results.map(result => result.hierarchical_structure);
    setSearchResults(results);
    setDirectSearchResults(resultStructures);
    setActiveFilters([]);
    setFilterModalResetTrigger(prev => prev + 1);
    setTreeSearchResults(resultStructures);
    setCurrentTreeSearchIndex(0);

    const findAncestors = (node, targetStructures, ancestors = []) => {
      if (targetStructures.includes(node.hierarchical_structure)) {
        return [...ancestors, node.hierarchical_structure];
      }
      if (node.children) {
        for (let child of node.children) {
          const result = findAncestors(child, targetStructures, [...ancestors, node.hierarchical_structure]);
          if (result.length > 0) return result;
        }
      }
      return [];
    };

    const allIncludedStructures = new Set();
    const addAncestors = (tree) => {
      resultStructures.forEach(structure => {
        const ancestors = findAncestors(tree, [structure]);
        ancestors.forEach(ancestorStructure => allIncludedStructures.add(ancestorStructure));
      });
    };

    addAncestors(orgData);
    setFilteredSearchResults(Array.from(allIncludedStructures));
    
    // Display toast notification based on search results
    if (results.length === 0) {
      toast.info("No results found for your search query.");
    } else {
      toast.success(`Found ${results.length} ${results.length === 1 ? 'result' : 'results'} for your search query.`);
    }
    
    // No automatic centering - user must click center button
  }, [orgData, setActiveFilters]);

  const handleTreeSearch = useCallback((term, renderedNodes) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setTreeSearchResults([]);
      setCurrentTreeSearchIndex(-1);
      return;
    }
    
    const results = renderedNodes.filter(node => {
      // Search through all node properties
      return Object.entries(node).some(([key, value]) => {
        // Skip non-searchable properties
        if (
          key === 'children' || 
          key === 'hierarchical_structure' || 
          key === 'id' || 
          value === null || 
          value === undefined
        ) {
          return false;
        }
        
        // Handle string values
        if (typeof value === 'string') {
          return value.toLowerCase().includes(term.toLowerCase());
        }
        
        // Handle array values (like role might be an array)
        if (Array.isArray(value)) {
          return value.some(item => 
            typeof item === 'string' && 
            item.toLowerCase().includes(term.toLowerCase())
          );
        }
        
        // Handle object values by converting to string
        if (typeof value === 'object') {
          const stringValue = JSON.stringify(value);
          return stringValue.toLowerCase().includes(term.toLowerCase());
        }
        
        return false;
      });
    });
    
    setTreeSearchResults(results.map(node => node.hierarchical_structure));
    
    // If we have results, set the current index to 0
    if (results.length > 0) {
      setCurrentTreeSearchIndex(0);
      toast.success(`Found ${results.length} ${results.length === 1 ? 'result' : 'results'} for "${term}"`); 
    } else {
      setCurrentTreeSearchIndex(-1);
      toast.info(`No results found for "${term}"`);
    }
  }, []);

  const handleTreeSearchNavigation = useCallback((direction, chartRef, transform, settings) => {
    if (treeSearchResults.length === 0) {
      toast.info("No search results to navigate");
      return null;
    }

    let newIndex = direction === 'next' 
      ? (currentTreeSearchIndex + 1) % treeSearchResults.length 
      : (currentTreeSearchIndex - 1 + treeSearchResults.length) % treeSearchResults.length;

    setCurrentTreeSearchIndex(newIndex);
    const currentNodeStructure = treeSearchResults[newIndex];
    
    if (currentNodeStructure) {
      const element = document.getElementById(`node-${currentNodeStructure}`);
      if (element) {
        // Highlight the element visually
        element.classList.add('search-highlight-pulse');
        setTimeout(() => {
          element.classList.remove('search-highlight-pulse');
        }, 2000);
        
        const rect = element.getBoundingClientRect();
        const { width: nodeWidth, height: nodeHeight } = rect;
        const chartRect = chartRef.current.getBoundingClientRect();
        const { width: chartWidth, height: chartHeight } = chartRect;

        const nodeX = (rect.left - chartRect.left) / transform.scale;
        const nodeY = (rect.top - chartRect.top) / transform.scale;

        // Use the search zoom level from settings, or default to 1.5
        const NAVIGATION_ZOOM_LEVEL = settings.searchZoomLevel || 1.5;
        
        // Center the node in the viewport
        const newX = -nodeX * NAVIGATION_ZOOM_LEVEL + (chartWidth - nodeWidth * NAVIGATION_ZOOM_LEVEL) / 2;
        const newY = -nodeY * NAVIGATION_ZOOM_LEVEL + (chartHeight - nodeHeight * NAVIGATION_ZOOM_LEVEL) / 2;

        // Adjust for toolbar height
        const toolbarHeight = 60;
        const adjustedY = newY + (toolbarHeight / 2);

        return { x: newX, y: adjustedY, scale: NAVIGATION_ZOOM_LEVEL };
      } else {
        toast.warning("Could not locate the search result element in the DOM");
      }
    }
    
    return null;
  }, [treeSearchResults, currentTreeSearchIndex]);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    setSearchResults(null);
    
    // No automatic centering - user must click center button
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveFilters([]);
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
    if (preFilterOrgData) {
      setFilteredOrgData(preFilterOrgData);
      setPreFilterOrgData(null);
      toast.info("Filters cleared");
    } else {
      setFilteredOrgData(orgData);
    }
    setExpandAll(false);
    setFilterModalResetTrigger(prev => prev + 1);
    
    // No automatic centering - user must click center button
  }, [
    orgData, 
    preFilterOrgData, 
    setFilteredOrgData, 
    setExpandAll
  ]);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]);
    setFilteredOrgData(orgData);
    setExpandAll(false);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
    
    // No automatic centering - user must click center button
  }, [orgData, setFilteredOrgData, setExpandAll]);

  const handleFilterByOrg = useCallback((orgName) => {
    if (!orgName) return;
    
    if (!preFilterOrgData) {
      setPreFilterOrgData(orgData);
    }
    
    setIsOrganizationMode(false);
    
    axios.get(
      `${API_BASE_URL}/search/${selectedFolderId}/${selectedTableId}`,
      {
        params: {
          query: orgName,
          columns: 'organization_name'
        },
      }
    )
      .then(response => {
        if (response.data && Array.isArray(response.data.results)) {
          const results = response.data.results;
          
          if (results.length > 0) {
            const resultStructures = results.map(result => result.hierarchical_structure);
            setSearchResults(results);
            setDirectSearchResults(resultStructures);
            setActiveFilters([]);
            setFilterModalResetTrigger(prev => prev + 1);
            setTreeSearchResults(resultStructures);
            setCurrentTreeSearchIndex(0);
            
            const findAncestors = (node, targetStructures, ancestors = []) => {
              if (targetStructures.includes(node.hierarchical_structure)) {
                return [...ancestors, node.hierarchical_structure];
              }
              if (node.children) {
                for (let child of node.children) {
                  const result = findAncestors(child, targetStructures, [...ancestors, node.hierarchical_structure]);
                  if (result.length > 0) return result;
                }
              }
              return [];
            };
            
            const allIncludedStructures = new Set();
            const addAncestors = (tree) => {
              resultStructures.forEach(structure => {
                const ancestors = findAncestors(tree, [structure]);
                ancestors.forEach(ancestorStructure => allIncludedStructures.add(ancestorStructure));
              });
            };
            
            addAncestors(orgData);
            setFilteredSearchResults(Array.from(allIncludedStructures));
            setExpandAll(true);
            // No automatic centering - user must click center button
            toast.success(`Found ${results.length} ${results.length === 1 ? 'person' : 'people'} in "${orgName}" organization`);
          } else {
            toast.info(`No people found in "${orgName}" organization`);
            if (preFilterOrgData) {
              setFilteredOrgData(preFilterOrgData);
              setPreFilterOrgData(null);
            }
          }
        }
      })
      .catch(error => {
        console.error("Error searching for organization:", error);
        toast.error("Failed to filter by organization. Please try again.");
        if (preFilterOrgData) {
          setFilteredOrgData(preFilterOrgData);
          setPreFilterOrgData(null);
        }
      });
  }, [
    API_BASE_URL,
    selectedFolderId,
    selectedTableId,
    orgData,
    preFilterOrgData,
    setIsOrganizationMode,
    setActiveFilters,
    setSearchResults,
    setDirectSearchResults,
    setFilterModalResetTrigger,
    setTreeSearchResults,
    setCurrentTreeSearchIndex,
    setFilteredSearchResults,
    setExpandAll,
    setFilteredOrgData
  ]);

  const toggleSearchBar = useCallback(() => {
    setIsSearchBarVisible(prev => {
      const newVisibility = !prev;
      if (!newVisibility) {
        setSearchTerm('');
        setTreeSearchResults([]);
        setCurrentTreeSearchIndex(-1);
      }
      return newVisibility;
    });
  }, []);

  return {
    activeFilters,
    setActiveFilters,
    searchResults,
    setSearchResults,
    searchTerm,
    setSearchTerm,
    directSearchResults,
    setDirectSearchResults,
    filteredSearchResults,
    setFilteredSearchResults,
    filterModalResetTrigger,
    setFilterModalResetTrigger,
    isSearchBarVisible,
    setIsSearchBarVisible,
    treeSearchResults,
    setTreeSearchResults,
    currentTreeSearchIndex,
    setCurrentTreeSearchIndex,
    preFilterOrgData,
    setPreFilterOrgData,
    handleSearch,
    handleTreeSearch,
    handleTreeSearchNavigation,
    handleFilterChange,
    handleClearFilter,
    handleClearSearch,
    handleFilterByOrg,
    toggleSearchBar
  };
};

export default useSearchAndFilter;
