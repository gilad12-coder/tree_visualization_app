import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, List, Target, Home, Menu, Upload,Download, Camera, FileText, X, Users, Layers} from "react-feather";
import axios from "axios";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useOrgChartContext } from "./OrgChartContext";
import FilterModal from "./FilterModal";
import TreeNode from "./TreeNode";
import EnhancedNodeCard from "./EnhancedNodeCard";
import Button from "./Button";
import FileUploadModal from "./FileUploadModal";
import TableSelectionModal from "./TableSelectionModal";
import ComparisonDashboard from "./ComparisonDashboard";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";
import ToolbarMenu from "./ToolbarMenu";
import html2canvas from 'html2canvas'; 
import SearchBar from './SearchBar.js';

const API_BASE_URL = "http://localhost:5000";

const OrgChart = ({
  dbPath,
  initialTableId,
  initialFolderId,
  onReturnToLanding,
}) => {
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [filteredSearchResults, setFilteredSearchResults] = useState([]);
  const { activeFilters, setActiveFilters, expandAll, setExpandAll } = useOrgChartContext();
  const [filterModalResetTrigger, setFilterModalResetTrigger] = useState(0);
  const [orgData, setOrgData] = useState(null);
  const [filteredOrgData, setFilteredOrgData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [initialTransform, setInitialTransform] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonTableSelected, setComparisonTableSelected] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isOrgMode, setIsOrgMode] = useState(false);
  const [orgModeData, setOrgModeData] = useState(null);
  const [treeSearchResults, setTreeSearchResults] = useState([]);
  const [currentTreeSearchIndex, setCurrentTreeSearchIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [renderedNodes, setRenderedNodes] = useState([]);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [settings, setSettings] = useState({
    moveAmount: 30,
    zoomAmount: 0.1,
    searchZoomLevel: 0.85,
  });
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;
  
    setIsLoading(true);
    setError(null);
  
    try {
      const [folderResponse, orgDataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/folder_structure`, {
          params: { db_path: dbPath },
        }),
        axios.get(`${API_BASE_URL}/org_data`, {
          params: { table_id: selectedTableId, db_path: dbPath },
        }),
      ]);
  
      setFolderStructure(folderResponse.data);
      
      if (orgDataResponse.data.log) {
        console.warn("Parsing log received:", orgDataResponse.data.log);
        
        // Create a Blob from the parsing log
        const blob = new Blob([JSON.stringify(orgDataResponse.data.log, null, 2)], { type: 'application/json' });
        
        // Create a link element, use it to download the blob, then remove it
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'parsing_log.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.warning("Parsing encountered issues. The log has been downloaded for your review.");
      }

      console.log(orgDataResponse.data)
      
      setOrgData(orgDataResponse.data.org_chart);
      setFilteredOrgData(orgDataResponse.data.org_chart);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
      setFolderStructure([]);
      setOrgData(null);
      setFilteredOrgData(null);
      
      if (error.response?.data?.log) {
        console.warn("Error log:", error.response.data.log);
        
        // Create a Blob from the error log
        const blob = new Blob([JSON.stringify(error.response.data.log, null, 2)], { type: 'application/json' });
        
        // Create a link element, use it to download the blob, then remove it
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

  const handleCenter = useCallback(() => {
    if (initialTransform) {
      setTransform(initialTransform);
    }
  }, [initialTransform]);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  }, [setExpandAll]);
  
  const handleExportImage = useCallback(() => {
    if (chartRef.current) {
      const element = chartRef.current;
      const scaleFactor = 2; // Adjust based on desired quality
  
      console.log("Starting image export process");
  
      // Store the original className
      const originalClassName = element.className;
  
      // Dynamically add the required classes to the element
      element.className += ' inline-block min-w-full min-h-full chart-container';
  
      setExpandAll(true);
  
      // Wait for nodes to expand and re-render
      setTimeout(() => {
        // Store original styles
        const originalTransform = element.style.transform;
        const originalTransition = element.style.transition;
        const originalWidth = element.style.width;
        const originalHeight = element.style.height;
  
        // Reset positioning and scaling
        element.style.transform = 'none';
        element.style.transition = 'none';
        element.style.width = 'auto';
        element.style.height = 'auto';
  
        // Force layout recalculation without triggering ESLint warning
        const forceReflow = element.offsetHeight;
        console.log("Forced reflow, element height:", forceReflow);
  
        // Get the actual content size after expansion
        const rect = element.getBoundingClientRect();
        const contentSize = {
          width: rect.width,
          height: rect.height
        };
  
        console.log("Chart content size:", contentSize);
  
        // Create a canvas with the full content size
        const canvas = document.createElement('canvas');
        canvas.width = contentSize.width * scaleFactor;
        canvas.height = contentSize.height * scaleFactor;
        const ctx = canvas.getContext('2d');
  
        // Scale the context
        ctx.scale(scaleFactor, scaleFactor);
  
        console.log("Canvas created and context scaled");
  
        // Capture the element with html2canvas
        html2canvas(element, {
          canvas: canvas,
          scale: 1, // We're handling scaling manually
          width: contentSize.width,
          height: contentSize.height,
          scrollX: 0,
          scrollY: 0,
          useCORS: true,
          logging: true, // Enable logging for debugging
        }).then((canvas) => {
          console.log("html2canvas capture completed");
  
          // Restore original styles
          element.style.transform = originalTransform;
          element.style.transition = originalTransition;
          element.style.width = originalWidth;
          element.style.height = originalHeight;
  
          // Restore original className after capture
          element.className = originalClassName;
  
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'org_chart.png';
            link.click();
            URL.revokeObjectURL(url);
  
            console.log("Image download initiated");
  
          }, 'image/png');
        }).catch((error) => {
          console.error('Error capturing image', error);
  
          // Restore original className even if there's an error
          element.className = originalClassName;
  
          // Restore original styles even if there's an error
          element.style.transform = originalTransform;
          element.style.transition = originalTransition;
          element.style.width = originalWidth;
          element.style.height = originalHeight;
  
        });
      }, 1000); // Adjust timeout as needed to ensure DOM updates are complete
    }
    handleCenter();
  }, [setExpandAll, handleCenter]);

  const handleOrgMode = useCallback(() => {
    setIsOrgMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        console.log("Entering Org Mode. Initial data:", filteredOrgData);
        
        const processOrgMode = (node) => {
          if (!node) {
            console.log("Encountered null node");
            return null;
          }
          
          console.log("Processing node:", node.name, "Children:", node.children?.length);
          
          const newNode = { ...node };
          
          if (node.children && node.children.length > 0) {
            newNode.children = node.children
              .map(processOrgMode)
              .filter(Boolean);
            
            console.log("Processed children for", node.name, "Remaining children:", newNode.children.length);
          }
          
          // Keep this node if it originally had children, even if they're all filtered out
          if (node.children && node.children.length > 0) {
            console.log("Keeping node", node.name, "in Org Mode");
            return newNode;
          } else {
            console.log("Removing leaf node", node.name, "from Org Mode");
            return null;
          }
        };
  
        const orgModeTree = processOrgMode(filteredOrgData);
        console.log("Org Mode processing complete. Result:", orgModeTree);
        
        if (orgModeTree) {
          setOrgModeData(orgModeTree);
          console.log("Setting Org Mode data");
        } else {
          console.log("No organizational structure found. Reverting to original data.");
          setOrgModeData(filteredOrgData);
          toast.warning("No organizational structure to display in Org Mode. Showing full tree.");
        }
      } else {
        console.log("Exiting Org Mode");
      }
      return newMode;
    });
  }, [filteredOrgData]);

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
            newNode.children = childResults
              .filter(result => result.node !== null)
              .map(result => result.node);
          }
          return { node: newNode, matchDepth: newMatchDepth };
        }
      }

      return { node: null, matchDepth: -1 };
    };

    const result = filterNode(node);
    return result.node;
  }, []);

  const findNodesInTree = useCallback((originalTree, searchResults) => {
    console.log("Starting findNodesInTree with:", { originalTree, searchResults });
    if (!originalTree || !searchResults || searchResults.length === 0) {
      console.log("Returning original tree due to invalid input");
      return originalTree;
    }

    const markNodesInPath = (node, targetId, path = []) => {
      console.log("Marking nodes in path:", { nodeId: node.person_id, targetId, path });
      if (!node) return false;

      if (node.person_id.toString() === targetId.toString()) {
        console.log("Target node found:", node.person_id);
        node.visible = true;
        return true;
      }

      if (node.children) {
        for (let child of node.children) {
          if (markNodesInPath(child, targetId, [...path, node.person_id])) {
            node.visible = true;
            console.log("Parent node marked visible:", node.person_id);
            return true;
          }
        }
      }

      return false;
    };

    const cloneTree = (node) => {
      if (!node) return null;
      const newNode = { ...node, visible: false };
      if (node.children) {
        newNode.children = node.children.map(child => cloneTree(child));
      }
      return newNode;
    };

    const newTree = cloneTree(originalTree);
    console.log("Cloned tree:", newTree);

    searchResults.forEach(result => {
      console.log("Processing search result:", result);
      markNodesInPath(newTree, result.person_id);
    });

    const filterVisibleNodes = (node) => {
      if (!node) return null;
      if (!node.visible) {
        console.log("Node filtered out:", node.person_id);
        return null;
      }
      const filteredNode = { ...node };
      delete filteredNode.visible;
      if (node.children) {
        filteredNode.children = node.children
          .map(filterVisibleNodes)
          .filter(Boolean);
      }
      console.log("Node kept in filtered tree:", filteredNode.person_id);
      return filteredNode;
    };

    const filteredTree = filterVisibleNodes(newTree);
    console.log("Final filtered tree:", filteredTree);
    return filteredTree;
  }, []);

  useEffect(() => {
    if (orgData) {
      console.log("Processing org data:", orgData);
      try {
        if (searchResults && searchResults.length > 0) {
          const searchedData = findNodesInTree(orgData, searchResults);
          if (searchedData) {
            console.log("Search results applied successfully");
            setFilteredOrgData(searchedData);
            setExpandAll(true);
          } else {
            console.warn("Failed to apply search results");
            toast.warning("The search results couldn't be rendered in the tree view. Please try a different search.");
            setFilteredOrgData(orgData);
            setExpandAll(false);
          }
        } else if (activeFilters.length > 0) {
          const filtered = filterOrgData(orgData, activeFilters);
          if (filtered === null) {
            console.warn("Failed to apply filters");
            toast.warning("The current filter couldn't be rendered in the tree view. Please adjust your filter criteria.");
            setFilteredOrgData(orgData);
            setExpandAll(false);
          } else {
            console.log("Filters applied successfully");
            setFilteredOrgData(filtered);
            setExpandAll(true);
          }
        } else {
          console.log("No search or filters active, using original data");
          setFilteredOrgData(orgData);
          setExpandAll(false);
        }
      } catch (error) {
        console.error("Error processing org data:", error);
        toast.error("An error occurred while processing the organizational data. Please try refreshing the page.");
        setFilteredOrgData(orgData);
        setExpandAll(false);
      }
    }
  }, [orgData, activeFilters, searchResults, filterOrgData, setExpandAll, findNodesInTree]);

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
  
  const handleFileUpload = async (uploadedData) => {
    console.log("File uploaded:", uploadedData);
    setSelectedTableId(uploadedData.table_id);
    setSelectedFolderId(uploadedData.folder_id);
    await fetchData();
    setIsUploadOpen(false);
  };

  const fetchComparisonData = useCallback(
    async (table1Id, table2Id) => {
      setIsComparisonLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/compare_tables/${selectedFolderId}`,
          {
            params: {
              table1_id: table1Id,
              table2_id: table2Id,
              db_path: dbPath,
            },
          }
        );
        // Ensure the response data has the expected structure
        console.log(response.data.aggregated_report)
        const processedData = {
          ...response.data,
          aggregated_report: {
            ...response.data.aggregated_report,
            department_changes: response.data.aggregated_report.department_changes || { total: 0, details: {} },
            role_changes: response.data.aggregated_report.role_changes || { total: 0, details: {} },
            rank_changes: response.data.aggregated_report.rank_changes || { total: 0, details: {} },
            reporting_line_changes: response.data.aggregated_report.reporting_line_changes || { total: 0, details: {} },
            total_employees: response.data.aggregated_report.total_employees || { before: 0, after: 0 },
            department_size_changes: response.data.aggregated_report.department_size_changes || {},
          },
        };
        setComparisonData(processedData);
        setIsComparing(true);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setError("Failed to fetch comparison data. Please try again.");
        setIsComparing(false);
      } finally {
        setIsComparisonLoading(false);
      }
    },
    [selectedFolderId, dbPath]
  );

  const handleTableSelection = useCallback(
    async (tableId, folderId) => {
      console.log("Table selected:", { tableId, folderId });
      if (isComparing) {
        setComparisonTableSelected(true);
        await fetchComparisonData(selectedTableId, tableId);
      } else {
        setSelectedTableId(tableId);
        setSelectedFolderId(folderId);
        await fetchData();
      }
      setIsTableSelectionOpen(false);
    },
    [fetchData, isComparing, selectedTableId, fetchComparisonData]
  );

  const handleNodeClick = useCallback(
    (node) => {
      console.log("Node clicked:", node);
      setSelectedNode((prevNode) => ({
        ...node,
        folderId: selectedFolderId,
        tableId: selectedTableId,
      }));
    },
    [selectedFolderId, selectedTableId]
  );

  const handleFilterChange = useCallback(
    (filters) => {
      console.log("Filters changed:", filters);
      setActiveFilters(filters);
      setSearchResults(null);
      setIsFilterOpen(false);
    },
    [setActiveFilters]
  );

  const handleSearch = useCallback((results) => {
    console.log("Search results received:", results);
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
  }, [orgData, setActiveFilters, setFilteredSearchResults, setTreeSearchResults]);

  const handleClearFilter = useCallback(() => {
    setActiveFilters([]);
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]); // Add this line
    setFilteredOrgData(orgData);
    setExpandAll(false);
    setFilterModalResetTrigger(prev => prev + 1);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
  }, [orgData, setActiveFilters, setExpandAll]);

  const handleClearSearch = useCallback(() => {
    console.log("Clearing search");
    setSearchResults(null);
    setFilteredSearchResults([]);
    setDirectSearchResults([]); // Add this line
    setFilteredOrgData(orgData);
    setExpandAll(false);
    setTreeSearchResults([]);
    setCurrentTreeSearchIndex(-1);
    setSearchTerm('');
  }, [orgData, setExpandAll]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setTransform((prev) => ({
          ...prev,
          x: prev.x + e.movementX,
          y: prev.y + e.movementY,
        }));
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform((prev) => {
      const newScale = Math.max(0.1, Math.min(3, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;
      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  const toggleFilterModal = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

  const toggleSearchBar = useCallback(() => {
    setIsSearchBarVisible((prev) => {
      const newVisibility = !prev;
      console.log("toggleSearchBar called. Setting visibility to:", newVisibility);
      
      if (!newVisibility) {
        // Reset search state when closing the search bar
        setSearchTerm('');
        setTreeSearchResults([]);
        setCurrentTreeSearchIndex(-1);
      }
      
      return newVisibility;
    });
  }, [setSearchTerm, setTreeSearchResults, setCurrentTreeSearchIndex]);

  const toggleHelpModal = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const toggleToolbarMenu = useCallback(() => {
    setIsToolbarMenuOpen((prev) => !prev);
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
  }, [setExpandAll]);

  const handleHome = useCallback(() => {
    setSelectedNode(null);
    handleCenter();
    onReturnToLanding();
  }, [handleCenter, onReturnToLanding]);

  const handleCompare = useCallback(() => {
    if (selectedFolderId) {
      setIsComparing(true);
      setComparisonTableSelected(false);
      setIsTableSelectionOpen(true);
    } else {
      console.log("Please select a folder before comparing tables");
    }
  }, [selectedFolderId]);

  const handleCloseTableSelection = useCallback(() => {
    setIsTableSelectionOpen(false);
    if (isComparing && !comparisonTableSelected) {
      setIsComparing(false);
      setComparisonData(null);
    }
  }, [isComparing, comparisonTableSelected]);

  const handleCloseComparison = useCallback(() => {
    setIsComparing(false);
    setComparisonData(null);
    setComparisonTableSelected(false);
  }, []);

  const handleTreeSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setTreeSearchResults([]);
      setCurrentTreeSearchIndex(-1);
      return;
    }
    const results = renderedNodes.filter(node => 
      node.name.toLowerCase().includes(term.toLowerCase()) || 
      node.role.toLowerCase().includes(term.toLowerCase())
    );
    setTreeSearchResults(results.map(node => node.hierarchical_structure));
    setCurrentTreeSearchIndex(results.length > 0 ? 0 : -1);
    console.log("Search results:", results);
  }, [renderedNodes]);

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

  const handleTreeSearchNavigation = useCallback((direction) => {
    if (treeSearchResults.length === 0) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentTreeSearchIndex + 1) % treeSearchResults.length;
    } else {
      newIndex = (currentTreeSearchIndex - 1 + treeSearchResults.length) % treeSearchResults.length;
    }
    setCurrentTreeSearchIndex(newIndex);

    console.log(`Navigating ${direction}. New index: ${newIndex}`);

    const currentNodeStructure = treeSearchResults[newIndex];
    if (currentNodeStructure) {
      const element = document.getElementById(`node-${currentNodeStructure}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const { width: nodeWidth, height: nodeHeight } = rect;

        const chartRect = chartRef.current.getBoundingClientRect();
        const { width: chartWidth, height: chartHeight } = chartRect;

        // Calculate the node's position relative to the chart
        const nodeX = (rect.left - chartRect.left) / transform.scale;
        const nodeY = (rect.top - chartRect.top) / transform.scale;

        console.log(`Node position (relative): x=${nodeX}, y=${nodeY}`);
        console.log(`Current transform: x=${transform.x}, y=${transform.y}, scale=${transform.scale}`);

        // Use the searchZoomLevel from settings
        const NAVIGATION_ZOOM_LEVEL = settings.searchZoomLevel;

        // Calculate the new position to center the node both horizontally and vertically
        const newX = -nodeX * NAVIGATION_ZOOM_LEVEL + (chartWidth - nodeWidth * NAVIGATION_ZOOM_LEVEL) / 2;
        const newY = -nodeY * NAVIGATION_ZOOM_LEVEL + (chartHeight - nodeHeight * NAVIGATION_ZOOM_LEVEL) / 2;

        // Adjust for the toolbar height (estimate, adjust as needed)
        const toolbarHeight = 60;
        const adjustedY = newY + (toolbarHeight / 2);

        console.log(`Calculated new position: x=${newX}, y=${adjustedY}`);

        // Update the transform
        setTransform(prev => {
          console.log(`Previous transform: x=${prev.x}, y=${prev.y}, scale=${prev.scale}`);
          console.log(`New transform: x=${newX}, y=${adjustedY}, scale=${NAVIGATION_ZOOM_LEVEL}`);
          return { x: newX, y: adjustedY, scale: NAVIGATION_ZOOM_LEVEL };
        });

        // Optionally, add a smooth transition effect
        chartRef.current.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
          chartRef.current.style.transition = '';
        }, 300);
      } else {
        console.warn(`Element with id node-${currentNodeStructure} not found`);
      }
    } else {
      console.warn(`No node found for index ${newIndex}`);
    }
  }, [treeSearchResults, currentTreeSearchIndex, transform, chartRef, settings.searchZoomLevel]);

  const handleHighlight = useCallback(
    async (hierarchicalNodeStructure) => {
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
    },
    [selectedTableId, highlightedNodes]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

const handleKeyDown = useCallback(
  (e) => {
    if (isUpdateModalOpen || isFilterOpen) return;

    const { moveAmount, zoomAmount } = settings;

    const singleKeyShortcuts = {
      'ArrowUp': () => setTransform((prev) => ({ ...prev, y: prev.y + moveAmount })),
      'ArrowDown': () => setTransform((prev) => ({ ...prev, y: prev.y - moveAmount })),
      'ArrowLeft': () => setTransform((prev) => ({ ...prev, x: prev.x + moveAmount })),
      'ArrowRight': () => setTransform((prev) => ({ ...prev, x: prev.x - moveAmount })),
      '=': () => setTransform((prev) => ({
        ...prev,
        scale: Math.min(3, prev.scale + zoomAmount),
      })),
      '-': () => setTransform((prev) => ({
        ...prev,
        scale: Math.max(0.1, prev.scale - zoomAmount),
      })),
    };

    const ctrlKeyShortcuts = {
      's': toggleFilterModal,
      'h': toggleHelpModal,
      'g': () => setIsTableSelectionOpen(true),
      'c': handleCenter,
      'e': handleExpandAll,
      'q': handleCollapseAll,
      'u': () => setIsUploadOpen(true),
      'm': handleCompare,
      'r': handleClearFilter,
      'o': handleOrgMode,
      'f': toggleSearchBar,
    };

    if (e.key in singleKeyShortcuts) {
      e.preventDefault();
      singleKeyShortcuts[e.key]();
    } else if (e.ctrlKey && e.key.toLowerCase() in ctrlKeyShortcuts) {
      e.preventDefault();
      ctrlKeyShortcuts[e.key.toLowerCase()]();
    }
  },
  [
    settings,
    isUpdateModalOpen,
    isFilterOpen,
    toggleFilterModal,
    toggleHelpModal,
    handleCenter,
    handleExpandAll,
    handleCollapseAll,
    handleCompare,
    handleClearFilter,
    handleOrgMode,
    toggleSearchBar,
    setIsTableSelectionOpen,
    setIsUploadOpen,
    setTransform,
  ]
);

useEffect(() => {
  document.addEventListener("keydown", handleKeyDown);
  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, [handleKeyDown]);


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
        <p className="text-xl mb-4">
          No data available. Please upload a file or select a table.
        </p>
        <Button
          onClick={() => setIsUploadOpen(true)}
          icon={Upload}
          className="mb-4"
        >
          Upload File
        </Button>
        <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>
          Select Table
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
      >
        {!isComparing && (
          <>
            <div className="absolute top-4 left-4 z-10 flex space-x-2 items-center">
              <Button onClick={handleHome} icon={Home} tooltip="Home">
                Home
              </Button>
              <Button
                onClick={handleCenter}
                icon={Target}
                tooltip="Center (Ctrl+C)"
              >
                Center
              </Button>
              <Button
                onClick={toggleFilterModal}
                icon={Filter}
                tooltip="Filter (Ctrl+F)"
              >
                Filter
              </Button>
              {(activeFilters.length > 0 || searchResults) && (
                <Button
                  onClick={handleClearFilter}
                  icon={X}
                  tooltip="Clear Filter"
                  variant="danger"
                >
                  Clear Filter
                </Button>
              )}
              <Button
                onClick={handleOrgMode}
                icon={Users}
                tooltip="Org Mode (Ctrl+G)"
                variant={isOrgMode ? "active" : "primary"}
              >
                Org Mode
              </Button>
              <Button
                onClick={() => setIsTableSelectionOpen(true)}
                icon={Layers}
                tooltip="Change Table (Ctrl+Q)"
              >
                Change Table
              </Button>
              <Button
                onClick={toggleToolbarMenu}
                icon={Menu}
                tooltip="More Options"
              >
                More
              </Button>
              <AnimatePresence>
                {isToolbarMenuOpen && (
                  <ToolbarMenu
                    isOpen={isToolbarMenuOpen}
                    onClose={() => setIsToolbarMenuOpen(false)}
                    onExpandAll={handleExpandAll}
                    onCollapseAll={handleCollapseAll}
                    onUpload={() => setIsUploadOpen(true)}
                    onCompare={handleCompare}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenHelp={toggleHelpModal}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="absolute top-4 right-4 z-10 flex items-center">
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
              <div className="relative">
                <Button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  icon={Download}
                  tooltip="Export Options"
                >
                  Export
                </Button>
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                    >
                      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        <button
                          onClick={handleExportExcel}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                          role="menuitem"
                        >
                          <FileText className="inline-block mr-2" size={16} />
                          Export as Excel
                        </button>
                        <button
                          onClick={handleExportImage}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                          role="menuitem"
                        >
                          <Camera className="inline-block mr-2" size={16} />
                          Capture Tree Image
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
        )}
        {!isComparing ? (
          <div
            ref={dragRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ overflow: "hidden" }}
          >
            <div
              ref={chartRef}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transition: isDragging ? "none" : "transform 0.3s ease-out",
                transformOrigin: "0 0",
              }}
            >
              <div className="p-8 pt-20">
              <TreeNode
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
/>
              </div>
            </div>
          </div>
        ) : (
          <ComparisonDashboard
            comparisonData={comparisonData}
            onClose={handleCloseComparison}
            isLoading={isComparisonLoading}
            error={error}
            onExportExcel={handleExportExcel}
            onExportImage={handleExportImage}
          />
        )}
      </motion.div>
      <AnimatePresence>
        {selectedNode && !isComparing && (
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
        isComparingMode={isComparing}
        currentTableId={selectedTableId}
      />
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleFileUpload}
        dbPath={dbPath}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

export default OrgChart;