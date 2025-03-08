import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { List, Upload } from "react-feather";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useOrgChartContext } from "./OrgChartContext";
import FilterModal from "./FilterModal";
import TreeNode from "./TreeNode";
import EnhancedNodeCard from "./EnhancedNodeCard";
import Button from "./HelperComponents/Button";
import FileUploadModal from "./FileUploadModal";
import TableSelectionModal from "./TableSelectionModal";
import SettingsModal from "./ToolsComponents/SettingsModal.js";
import HelpModal from "./ToolsComponents/HelpModal.js";
import html2canvas from 'html2canvas'; 
import SearchBar from './HelperComponents/SearchBar.js';
import NavigationBar from "./HelperComponents/NavigationBar.js";

const API_BASE_URL = "http://localhost:5001";

const OrgChart = ({ dbPath, initialTableId, initialFolderId, onReturnToLanding }) => {
  // =========== Context & Core State ===========
  const { 
    activeFilters, 
    setActiveFilters, 
    expandAll, 
    setExpandAll,
    nodeOrder,
    selectedSwapNode,
    handleSelectForSwap,
    handleSwapNodes,
    handleCancelSwap,
    handleReorderNodes
  } = useOrgChartContext();
  
  const [orgData, setOrgData] = useState(null);
  const [filteredOrgData, setFilteredOrgData] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [folderStructure, setFolderStructure] = useState([]);
  
  // =========== UI State ===========
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [initialTransform, setInitialTransform] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOrgMode, setIsOrgMode] = useState(false);
  const [hideVacancies, setHideVacancies] = useState(false); // New state for hiding vacant positions
  const [orgModeData, setOrgModeData] = useState(null);
  const [collapseAll, setCollapseAll] = useState(false);
  const [swapKey, setSwapKey] = useState(0);
  const [settings, setSettings] = useState({
    moveAmount: 30,
    zoomAmount: 0.1,
    searchZoomLevel: 0.85,
    primaryField: 'name',
    secondaryField: 'role'
  });
  
  // =========== Modal State ===========
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  // =========== Search & Filter State ===========
  const [searchResults, setSearchResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [filteredSearchResults, setFilteredSearchResults] = useState([]);
  const [filterModalResetTrigger, setFilterModalResetTrigger] = useState(0);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [treeSearchResults, setTreeSearchResults] = useState([]);
  const [currentTreeSearchIndex, setCurrentTreeSearchIndex] = useState(0);
  
  // =========== Node State ===========
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [renderedNodes, setRenderedNodes] = useState([]);
  
  // =========== Status State ===========
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // =========== Refs ===========
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  // =========== Data Functions ===========
  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [folderResponse, orgDataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/folder_structure`, { params: { db_path: dbPath } }),
        axios.get(`${API_BASE_URL}/org_data`, { params: { table_id: selectedTableId, db_path: dbPath } }),
      ]);

      setFolderStructure(folderResponse.data);

      if (orgDataResponse.data.log) {
        const blob = new Blob([JSON.stringify(orgDataResponse.data.log, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'parsing_log.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.warning("Parsing encountered issues. The log has been downloaded for your review.");
      }

      setOrgData(orgDataResponse.data.org_chart);
      setFilteredOrgData(orgDataResponse.data.org_chart);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
      setFolderStructure([]);
      setOrgData(null);
      setFilteredOrgData(null);

      if (error.response?.data?.log) {
        const blob = new Blob([JSON.stringify(error.response.data.log, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'error_log.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.error("An error occurred. The error log has been downloaded for your review.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dbPath, selectedTableId]);
  
  const filterOrgData = useCallback((node, filters) => {
    const matchesFilter = (n) => {
      if (filters.length === 0) return true;
      return filters.every(filter => {
        const value = n[filter.type];
        return value !== null && value.toString().toLowerCase().includes(filter.value.toLowerCase());
      });
    };

    const filterNode = (n, depth = 0, matchDepth = -1) => {
      if (!n) return { node: null, matchDepth: -1 };

      const currentNodeMatch = matchesFilter(n);
      const newNode = { ...n };

      if (currentNodeMatch) {
        matchDepth = depth;
        if (n.children) {
          newNode.children = n.children.map(child => ({ ...child, children: child.children }));
        }
        return { node: newNode, matchDepth };
      }

      if (n.children) {
        const childResults = n.children.map(child => filterNode(child, depth + 1, matchDepth));
        const newMatchDepth = childResults.reduce((max, result) => Math.max(max, result.matchDepth), matchDepth);

        if (newMatchDepth !== -1) {
          if (depth === newMatchDepth - 1) {
            newNode.children = n.children.map(child => {
              const childResult = childResults.find(result => result.node && result.node.name === child.name);
              return childResult ? childResult.node : { ...child, children: null };
            });
          } else {
            newNode.children = childResults.filter(result => result.node !== null).map(result => result.node);
          }
          return { node: newNode, matchDepth: newMatchDepth };
        }
      }

      return { node: null, matchDepth: -1 };
    };

    return filterNode(node).node;
  }, []);

  // Function to remove vacant positions (nodes with NaN person_id)
  const removeVacantPositions = useCallback((node) => {
    if (!node) return null;
    
    // Check if current node is vacant (has NaN person_id)
    const isVacant = node.person_id === "nan";
    
    // If current node is vacant, don't include it
    if (isVacant) return null;
    
    const newNode = { ...node };
    
    // Process children recursively if they exist
    if (node.children && node.children.length > 0) {
      newNode.children = node.children
        .map(removeVacantPositions)
        .filter(Boolean); // Remove null entries
    }
    
    return newNode;
  }, []);

  const findNodesInTree = useCallback((originalTree, searchResults) => {
    if (!originalTree || !searchResults || searchResults.length === 0) {
      return originalTree;
    }
  
    const markNodesInPath = (node, targetId) => {
      if (!node) return false;
  
      // Store if the current node matches
      let currentNodeMatches = false;
      
      // Check if this node matches the targetId
      if (node.person_id && node.person_id.toString() === targetId.toString()) {
        node.visible = true;
        currentNodeMatches = true;
        // Don't return true here - continue checking children
      }
  
      // Check all children and maintain visibility
      let childrenMatch = false;
      if (node.children) {
        for (let child of node.children) {
          // Continue to process all children, even if one already matched
          if (markNodesInPath(child, targetId)) {
            node.visible = true;
            childrenMatch = true;
          }
        }
      }
  
      // Return true if either this node or any of its children matched
      return currentNodeMatches || childrenMatch;
    };
  
    const cloneTree = (node) => {
      if (!node) return null;
      const newNode = { ...node, visible: false };
      if (node.children) {
        newNode.children = node.children.map(cloneTree);
      }
      return newNode;
    };
  
    const newTree = cloneTree(originalTree);
    
    // Process all search results
    searchResults.forEach(result => markNodesInPath(newTree, result.person_id));
  
    const filterVisibleNodes = (node) => {
      if (!node) return null;
      if (!node.visible) return null;
      const filteredNode = { ...node };
      delete filteredNode.visible;
      if (node.children) {
        filteredNode.children = node.children.map(filterVisibleNodes).filter(Boolean);
      }
      return filteredNode;
    };
  
    return filterVisibleNodes(newTree);
  }, []);
  
  const getParentNode = useCallback((hierarchicalStructure) => {
    const findParent = (node, targetStructure) => {
      if (!node) return null;
      if (node.children) {
        for (let child of node.children) {
          if (child.hierarchical_structure === targetStructure) {
            return node;
          }
          const result = findParent(child, targetStructure);
          if (result) return result;
        }
      }
      return null;
    };

    return findParent(filteredOrgData, hierarchicalStructure);
  }, [filteredOrgData]);

  // =========== Helper Functions ===========
  const duplicatePersonIds = useMemo(() => {
    const personIdCounts = {};
    const countPersonIds = (node) => {
      if (!node) return;
      if (node.person_id) {
        personIdCounts[node.person_id] = (personIdCounts[node.person_id] || 0) + 1;
      }
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(countPersonIds);
      }
    };
    countPersonIds(filteredOrgData);
    return personIdCounts;
  }, [filteredOrgData]);
  
  // =========== Handler Functions ===========
  // Toggle hide vacancies handler
  const handleToggleVacancies = useCallback(() => {
    setHideVacancies(prev => !prev);
  }, []);

  // Node swapping handler with redraw trigger
  const handleSwapNodesWithRerender = useCallback((parentId, node1Id, node2Id) => {
    handleSwapNodes(parentId, node1Id, node2Id);
    setSwapKey(prev => prev + 1);
    // Only update the affected connections - no need to redraw the whole tree
    setTimeout(() => {
      const parentElement = document.getElementById(`node-${parentId}`);
      if (parentElement) {
        const childContainer = parentElement.closest('.flex-col').querySelector('.pt-8');
        if (childContainer) {
          const connections = childContainer.querySelectorAll('.bg-gray-400');
          connections.forEach(conn => {
            conn.style.opacity = '0.99';
            // eslint-disable-next-line no-unused-vars
            const forceReflow = conn.offsetHeight;
            conn.style.opacity = '1';
          });
        }
      }
    }, 50);
  }, [handleSwapNodes]);

  // Background click to cancel swap
  const handleBackgroundClick = useCallback((e) => {
    if (e.target === e.currentTarget && selectedSwapNode) {
      handleCancelSwap();
    }
  }, [selectedSwapNode, handleCancelSwap]);

  // Navigation handlers
  const handleCenter = useCallback(() => {
    if (initialTransform) {
      setTransform(initialTransform);
    }
  }, [initialTransform]);
  
  const handleHome = useCallback(() => {
    setSelectedNode(null);
    handleCenter();
    onReturnToLanding();
  }, [handleCenter, onReturnToLanding]);

  // Node handlers
  const handleNodeClick = useCallback((node) => {
    setSelectedNode({ ...node, folderId: selectedFolderId, tableId: selectedTableId });
  }, [selectedFolderId, selectedTableId]);
  
  const handleHighlight = useCallback(async (hierarchicalNodeStructure) => {
    try {
      if (highlightedNodes.includes(hierarchicalNodeStructure)) {
        setHighlightedNodes([]);
      } else {
        const response = await axios.get(`${API_BASE_URL}/highlight_nodes`, {
          params: {
            hierarchical_structure: hierarchicalNodeStructure,
            table_id: selectedTableId,
          },
        });
        setHighlightedNodes(response.data.highlighted_nodes);
      }
    } catch (error) {
      console.error("Error fetching highlighted nodes:", error);
      setHighlightedNodes([]);
    }
  }, [selectedTableId, highlightedNodes]);
  
  const handleNodeRendered = useCallback((node) => {
    setRenderedNodes(prev => {
      const existing = prev.find(n => n.hierarchical_structure === node.hierarchical_structure);
      if (!existing) {
        return [...prev, node];
      }
      return prev;
    });
  }, []);

  const handleNodeUnrendered = useCallback((nodeStructure) => {
    setRenderedNodes(prev => prev.filter(node => node.hierarchical_structure !== nodeStructure));
  }, []);

  // Tree expansion handlers
  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
  }, [setExpandAll]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  }, [setExpandAll]);

  // Mode handlers
  const handleOrgMode = useCallback(() => {
    setIsOrgMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        const processOrgMode = (node) => {
          if (!node) return null;
          const newNode = { ...node };

          if (node.children && node.children.length > 0) {
            newNode.children = node.children.map(processOrgMode).filter(Boolean);
          }

          return node.children && node.children.length > 0 ? newNode : null;
        };

        const orgModeTree = processOrgMode(filteredOrgData);
        
        if (orgModeTree) {
          setOrgModeData(orgModeTree);
        } else {
          setOrgModeData(filteredOrgData);
          toast.warning("No organizational structure to display in Org Mode. Showing full tree.");
        }
      }
      return newMode;
    });
  }, [filteredOrgData]);

  // Search and filter handlers
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
  }, [orgData, setActiveFilters]);
  
  const handleTreeSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setTreeSearchResults([]);
      setCurrentTreeSearchIndex(-1);
      return;
    }
    
    // Improve search for nodes with multiple roles
    const results = renderedNodes.filter(node => {
      // Check if the name or role contains the search term
      const nameMatch = node.name && node.name.toLowerCase().includes(term.toLowerCase());
      
      // Handle role as potentially an array or string
      let roleMatch = false;
      if (typeof node.role === 'string') {
        roleMatch = node.role.toLowerCase().includes(term.toLowerCase());
      } else if (Array.isArray(node.role)) {
        roleMatch = node.role.some(r => r.toLowerCase().includes(term.toLowerCase()));
      }
      
      return nameMatch || roleMatch;
    });
    
    setTreeSearchResults(results.map(node => node.hierarchical_structure));
    setCurrentTreeSearchIndex(results.length > 0 ? 0 : -1);
  }, [renderedNodes]);
  
  const handleTreeSearchNavigation = useCallback((direction) => {
    if (treeSearchResults.length === 0) return;

    let newIndex = direction === 'next' 
      ? (currentTreeSearchIndex + 1) % treeSearchResults.length 
      : (currentTreeSearchIndex - 1 + treeSearchResults.length) % treeSearchResults.length;

    setCurrentTreeSearchIndex(newIndex);
    const currentNodeStructure = treeSearchResults[newIndex];
    if (currentNodeStructure) {
      const element = document.getElementById(`node-${currentNodeStructure}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const { width: nodeWidth, height: nodeHeight } = rect;
        const chartRect = chartRef.current.getBoundingClientRect();
        const { width: chartWidth, height: chartHeight } = chartRect;

        const nodeX = (rect.left - chartRect.left) / transform.scale;
        const nodeY = (rect.top - chartRect.top) / transform.scale;

        const NAVIGATION_ZOOM_LEVEL = settings.searchZoomLevel;
        const newX = -nodeX * NAVIGATION_ZOOM_LEVEL + (chartWidth - nodeWidth * NAVIGATION_ZOOM_LEVEL) / 2;
        const newY = -nodeY * NAVIGATION_ZOOM_LEVEL + (chartHeight - nodeHeight * NAVIGATION_ZOOM_LEVEL) / 2;

        const toolbarHeight = 60;
        const adjustedY = newY + (toolbarHeight / 2);

        setTransform(prev => ({ x: newX, y: adjustedY, scale: NAVIGATION_ZOOM_LEVEL }));
        chartRef.current.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
          chartRef.current.style.transition = '';
        }, 300);
      }
    }
  }, [treeSearchResults, currentTreeSearchIndex, transform, chartRef, settings.searchZoomLevel]);
  
  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    setSearchResults(null);
    setIsFilterOpen(false);
  }, [setActiveFilters]);
  
  const handleClearFilter = useCallback(() => {
    setActiveFilters([]);
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]);
    setFilteredOrgData(orgData);
    setExpandAll(false);
    setFilterModalResetTrigger(prev => prev + 1);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
  }, [orgData, setActiveFilters, setExpandAll]);
  
  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]);
    setFilteredOrgData(orgData);
    setExpandAll(false);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
  }, [orgData, setExpandAll]);

  // UI toggle handlers
  const toggleFilterModal = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);
  
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
  
  const toggleHelpModal = useCallback(() => {
    setIsHelpOpen(prev => !prev);
  }, []);
  
  const handleCloseTableSelection = useCallback(() => {
    setIsTableSelectionOpen(false);
  }, []);

  // Export handlers
  const handleExportExcel = useCallback(() => {
    axios({
      url: `${API_BASE_URL}/export_excel/${selectedTableId}`,
      method: 'GET',
      responseType: 'blob',
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `org_data_table_${selectedTableId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }).catch((error) => {
      console.error("Error exporting Excel:", error);
      toast.error("Failed to export as Excel. Please try again.");
    });
  }, [selectedTableId]);
  
  const handleExportImage = useCallback(() => {
    if (chartRef.current) {
      const element = chartRef.current;
      const scaleFactor = 2;

      const originalClassName = element.className;
      element.className += ' inline-block min-w-full min-h-full chart-container';
      setExpandAll(true);

      setTimeout(() => {
        const originalStyles = {
          transform: element.style.transform,
          transition: element.style.transition,
          width: element.style.width,
          height: element.style.height,
        };

        element.style.transform = 'none';
        element.style.transition = 'none';
        element.style.width = 'auto';
        element.style.height = 'auto';

        // eslint-disable-next-line no-unused-vars
        const forceReflow = element.offsetHeight;
        const rect = element.getBoundingClientRect();
        const contentSize = { width: rect.width, height: rect.height };

        const canvas = document.createElement('canvas');
        canvas.width = contentSize.width * scaleFactor;
        canvas.height = contentSize.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        ctx.scale(scaleFactor, scaleFactor);

        html2canvas(element, {
          canvas: canvas,
          scale: 1,
          width: contentSize.width,
          height: contentSize.height,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          logging: true,
        }).then((canvas) => {
          Object.assign(element.style, originalStyles);
          element.className = originalClassName;

          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'org_chart.png';
            link.click();
            URL.revokeObjectURL(url);
          }, 'image/png');
        }).catch((error) => {
          console.error('Error capturing image', error);
          Object.assign(element.style, originalStyles);
          element.className = originalClassName;
        });
      }, 1000);
    }
    handleCenter();
  }, [setExpandAll, handleCenter]);

  // File handling
  const handleFileUpload = async (uploadedData) => {
    setSelectedTableId(uploadedData.table_id);
    setSelectedFolderId(uploadedData.folder_id);
    await fetchData();
    setIsUploadOpen(false);
  };
  
  const handleTableSelection = useCallback(async (tableId, folderId) => {
    setSelectedTableId(tableId);
    setSelectedFolderId(folderId);
    await fetchData();
    setIsTableSelectionOpen(false);
  }, [fetchData]);

  // Chart pan/zoom handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform(prev => {
      const newScale = Math.max(0.1, Math.min(3, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;
      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (isUpdateModalOpen || isFilterOpen) return;

    // Clear swap selection on Escape
    if (e.key === 'Escape' && selectedSwapNode) {
      handleCancelSwap();
      return;
    }

    const { moveAmount, zoomAmount } = settings;

    const singleKeyShortcuts = {
      'ArrowUp': () => setTransform(prev => ({ ...prev, y: prev.y + moveAmount })),
      'ArrowDown': () => setTransform(prev => ({ ...prev, y: prev.y - moveAmount })),
      'ArrowLeft': () => setTransform(prev => ({ ...prev, x: prev.x + moveAmount })),
      'ArrowRight': () => setTransform(prev => ({ ...prev, x: prev.x - moveAmount })),
      '=': () => setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale + zoomAmount) })),
      '-': () => setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - zoomAmount) })),
    };

    const ctrlKeyShortcuts = {
      's': toggleFilterModal,
      'h': toggleHelpModal,
      'g': () => setIsTableSelectionOpen(true),
      'c': handleCenter,
      'e': handleExpandAll,
      'q': handleCollapseAll,
      'u': () => setIsUploadOpen(true),
      'r': handleClearFilter,
      'o': handleOrgMode,
      'f': toggleSearchBar,
      'v': handleToggleVacancies // New shortcut for toggling vacancies
    };

    if (e.key in singleKeyShortcuts) {
      e.preventDefault();
      singleKeyShortcuts[e.key]();
    } else if (e.ctrlKey && e.key.toLowerCase() in ctrlKeyShortcuts) {
      e.preventDefault();
      ctrlKeyShortcuts[e.key.toLowerCase()]();
    }
  }, [
    settings,
    isUpdateModalOpen,
    isFilterOpen,
    selectedSwapNode,
    handleCancelSwap,
    toggleFilterModal,
    toggleHelpModal,
    handleCenter,
    handleExpandAll,
    handleCollapseAll,
    handleClearFilter,
    handleOrgMode,
    handleToggleVacancies,
    toggleSearchBar,
    setIsTableSelectionOpen,
    setIsUploadOpen,
    setTransform
  ]);

  // =========== Effects ===========
  // Fetch data on mount and when table changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters when data or filters change
  useEffect(() => {
    if (orgData) {
      try {
        let processedData = orgData;
        
        // Apply hide vacancies filter first if enabled
        if (hideVacancies) {
          processedData = removeVacantPositions(processedData);
          if (!processedData) {
            toast.warning("No data available after hiding vacant positions.");
            processedData = orgData; // Fallback if all nodes are filtered out
            setHideVacancies(false);
          }
        }
        
        // Then apply search results filter
        if (searchResults && searchResults.length > 0) {
          const searchedData = findNodesInTree(processedData, searchResults);
          setFilteredOrgData(searchedData || processedData);
          setExpandAll(!!searchedData);
        } 
        // Then apply other filters
        else if (activeFilters.length > 0) {
          const filtered = filterOrgData(processedData, activeFilters);
          setFilteredOrgData(filtered || processedData);
          setExpandAll(!!filtered);
        } 
        // No filters
        else {
          setFilteredOrgData(processedData);
          setExpandAll(false);
        }
      } catch (error) {
        console.error("Error processing org data:", error);
        toast.error("An error occurred while processing the organizational data. Please try refreshing the page.");
        setFilteredOrgData(orgData);
        setExpandAll(false);
      }
    }
  }, [orgData, activeFilters, searchResults, hideVacancies, filterOrgData, setExpandAll, findNodesInTree, removeVacantPositions]);

  // Set up initial transform
  useEffect(() => {
    const updateInitialTransform = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2 - rect.width / 2;
        const centerY = (window.innerHeight / 2 - rect.height / 2) * 0.9;
        const initialState = { x: centerX, y: centerY, scale: 1 };
        setInitialTransform(initialState);
        setTransform(initialState);
      }
    };

    updateInitialTransform();
    window.addEventListener("resize", updateInitialTransform);
    return () => {
      window.removeEventListener("resize", updateInitialTransform);
    };
  }, [orgData]);

  // Handle drag events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Set up keyboard shortcuts
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Add document click handler to cancel swap selection when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // If we have a selected swap node and we're clicking on the background (not a node)
      if (selectedSwapNode && !e.target.closest('[id^="node-"]')) {
        handleCancelSwap();
      }
    };

    if (selectedSwapNode) {
      document.addEventListener('click', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [selectedSwapNode, handleCancelSwap]);

  // =========== Render Functions ===========
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="flex justify-center items-center h-screen text-2xl text-gray-600"
      >
        Loading...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-red-600 text-xl mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </motion.div>
    );
  }

  if (!dbPath || !selectedTableId || !filteredOrgData) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-xl mb-4">No data available. Please upload a file or select a table.</p>
        <Button onClick={() => setIsUploadOpen(true)} icon={Upload} className="mb-4">Upload File</Button>
        <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>Select Table</Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 pt-20"
      >
        {/* Navigation Bar */}
        <NavigationBar
          onHome={handleHome}
          onCenter={handleCenter}
          onFilter={toggleFilterModal}
          onOrgMode={handleOrgMode}
          onToggleVacancies={handleToggleVacancies}
          onChangeTable={() => setIsTableSelectionOpen(true)}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onUpload={() => setIsUploadOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={toggleHelpModal}
          onSearch={toggleSearchBar}
          onClearFilter={handleClearFilter}
          onExportExcel={handleExportExcel}
          onExportImage={handleExportImage}
          isOrgMode={isOrgMode}
          hideVacancies={hideVacancies}
          hasActiveFilters={activeFilters.length > 0 || searchResults}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          selectedTableId={selectedTableId}
        />
  
        {/* Search Bar */}
        <div className="absolute top-18 right-4 z-10 flex items-center">
          <AnimatePresence>
            {isSearchBarVisible && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }} 
                animate={{ opacity: 1, width: "auto" }} 
                exit={{ opacity: 0, width: 0 }} 
                transition={{ duration: 0.3 }} 
                className="mr-2"
              >
                <SearchBar
                  onSearch={handleTreeSearch}
                  totalResults={treeSearchResults.length}
                  currentResult={currentTreeSearchIndex + 1}
                  onNavigate={handleTreeSearchNavigation}
                  onClose={toggleSearchBar}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  autoFocus={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
  
        {/* Swap Instructions */}
{selectedSwapNode && (
  <div className="fixed top-20 inset-x-0 flex justify-center z-40">
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-md shadow-md"
    >
      <span className="font-medium text-sm">
        Node selected for swapping.
      </span>
      <span className="text-sm ml-1">
        Click another node at the same level to swap positions, or click elsewhere to cancel.
      </span>
    </motion.div>
  </div>
)}
  
        {/* Main Content */}
        <div 
          ref={dragRef} 
          className="w-full h-full cursor-move" 
          onMouseDown={handleMouseDown} 
          onWheel={handleWheel} 
          onClick={handleBackgroundClick}
          style={{ overflow: "hidden" }}
        >
          <div 
            ref={chartRef} 
            style={{ 
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, 
              transition: isDragging ? "none" : "transform 0.3s ease-out", 
              transformOrigin: "0 0" 
            }}
          >
            <div className="p-8 pt-20">
              <TreeNode
                key={`tree-${swapKey}`}
                node={isOrgMode ? (orgModeData || filteredOrgData) : filteredOrgData}
                onNodeClick={handleNodeClick}
                expandAll={expandAll}
                collapseAll={collapseAll}
                folderId={selectedFolderId}
                tableId={selectedTableId}
                highlightedNodes={highlightedNodes}
                onHighlight={handleHighlight}
                isOrgMode={isOrgMode}
                searchTerm={searchTerm}
                searchResults={treeSearchResults}
                currentSearchIndex={currentTreeSearchIndex}
                onNodePosition={(id, x, y) => {
                  const element = document.getElementById(`node-${id}`);
                  if (element) {
                    element.dataset.x = x;
                    element.dataset.y = y;
                  }
                }}
                onNodeRendered={handleNodeRendered}
                onNodeUnrendered={handleNodeUnrendered}
                filteredSearchResults={filteredSearchResults}
                directSearchResults={directSearchResults}
                duplicatePersonIds={duplicatePersonIds}
                settings={settings}
                onReorder={handleReorderNodes}
                nodeOrder={nodeOrder}
                parentNodeId={null}
                selectedSwapNode={selectedSwapNode}
                onSelectForSwap={handleSelectForSwap}
                onSwapNodes={handleSwapNodesWithRerender}
                onCancelSwap={handleCancelSwap}
              />
            </div>
          </div>
        </div>
  
        {/* Modals */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSettingsChange={setSettings}
        />
  
        <AnimatePresence>
          {selectedNode && (
            <EnhancedNodeCard
              node={selectedNode}
              onClose={() => {
                setSelectedNode(null);
                setIsUpdateModalOpen(false);
              }}
              folderId={selectedFolderId}
              tableId={selectedTableId}
              folderStructure={folderStructure}
              onUpdateComplete={fetchData}
              onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
              onCloseUpdateModal={() => setIsUpdateModalOpen(false)}
              getParentNode={getParentNode}
            />
          )}
        </AnimatePresence>
  
        <FilterModal
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApplyFilters={handleFilterChange}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          activeFilters={activeFilters}
          orgData={orgData}
          folderId={selectedFolderId}
          tableId={selectedTableId}
          resetTrigger={filterModalResetTrigger}
        />
  
        <TableSelectionModal
          isOpen={isTableSelectionOpen}
          onClose={handleCloseTableSelection}
          onSelectTable={handleTableSelection}
          folderStructure={folderStructure}
          currentFolderId={selectedFolderId}
          currentTableId={selectedTableId}
        />
  
        <FileUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleFileUpload}
          dbPath={dbPath}
        />
  
        <HelpModal 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
        />
      </motion.div>
    </>
  );
};

export default OrgChart;