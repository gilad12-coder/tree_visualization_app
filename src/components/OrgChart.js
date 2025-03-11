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
import OrgNode from './OrgNode';

const API_BASE_URL = "http://localhost:5001";

const OrgChart = ({ dbPath, initialTableId, initialFolderId, onReturnToLanding }) => {
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
  const [filteredOrgId, setFilteredOrgId] = useState(null);
  const [originalOrgData, setOriginalOrgData] = useState(null);
  const [preFilterOrgData, setPreFilterOrgData] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [folderStructure, setFolderStructure] = useState([]);
  
  // Removing needsCentering state as we're eliminating automatic centering
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [initialRootPosition, setInitialRootPosition] = useState(null); // State to store initial root position
  // Add mode-specific position storage
  const [regularModePosition, setRegularModePosition] = useState(null);
  const [orgModePosition, setOrgModePosition] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isHierarchyMode, setIsHierarchyMode] = useState(false);
  const [isOrganizationMode, setIsOrganizationMode] = useState(false);
  const [hideVacancies, setHideVacancies] = useState(false);
  const [hierarchyModeData, setHierarchyModeData] = useState(null);
  const [organizationModeData, setOrganizationModeData] = useState(null);
  const [collapseAll, setCollapseAll] = useState(false);
  const [swapKey, setSwapKey] = useState(0);
  const [settings, setSettings] = useState({
    moveAmount: 30,
    zoomAmount: 0.1,
    searchZoomLevel: 0.85,
    primaryField: 'name',
    secondaryField: 'role'
  });
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  
  const [searchResults, setSearchResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [directSearchResults, setDirectSearchResults] = useState([]);
  const [filteredSearchResults, setFilteredSearchResults] = useState([]);
  const [filterModalResetTrigger, setFilterModalResetTrigger] = useState(0);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [treeSearchResults, setTreeSearchResults] = useState([]);
  const [currentTreeSearchIndex, setCurrentTreeSearchIndex] = useState(0);
  
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [renderedNodes, setRenderedNodes] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const dragRef = useRef(null);
  const chartRef = useRef(null);

const findRootNodeElement = useCallback(() => {
  const rootNodeId = isOrganizationMode
    ? `orgnode-${organizationModeData?.hierarchical_structure}`
    : isHierarchyMode
    ? `node-${hierarchyModeData?.hierarchical_structure}`
    : `node-${filteredOrgData?.hierarchical_structure}`;
    
  let rootElement = document.getElementById(rootNodeId);
  if (!rootElement) {
    const allNodes = document.querySelectorAll('[id^="node-"], [id^="orgnode-"]');
    if (allNodes.length > 0) {
      let highestElement = null;
      let highestY = Infinity;
      
      allNodes.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < highestY) {
          highestY = rect.top;
          highestElement = el;
        }
      });
      
      rootElement = highestElement;
    }
  }
  
  return rootElement;
}, [isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData]);

// Modified function to store the initial position of the root node WITHOUT applying it
const storeInitialRootPosition = useCallback(() => {
  const rootElement = findRootNodeElement();
  
  if (rootElement && chartRef.current) {
    try {
      const rootRect = rootElement.getBoundingClientRect();
      const chartRect = chartRef.current.getBoundingClientRect();
      
      // Account for the navigation bar height
      const navBarHeight = 60;
      
      // Calculate center coordinates
      const centerX = window.innerWidth / 2 - rootRect.width / 2;
      const centerY = (window.innerHeight - navBarHeight) / 2 - rootRect.height / 2 + navBarHeight;
      
      // Calculate the transform to center the root node
      const x = centerX - rootRect.left + chartRect.left;
      const y = centerY - rootRect.top + chartRect.top;
      
      // Store position for future use only, without applying it
      setInitialRootPosition({ x, y, scale: 1 });
      console.log("Stored initial position:", { x, y, scale: 1 });
      
      // No longer automatically applying the transform here
    } catch (error) {
      console.error("Error calculating initial position:", error);
    }
  }
}, [findRootNodeElement]);

// Updated function to center the chart - using mode-specific positions
const centerOnRoot = useCallback(() => {
  // Use the appropriate stored position based on current mode
  const positionToUse = isOrganizationMode ? 
                         orgModePosition : 
                         regularModePosition || initialRootPosition;
  
  if (positionToUse) {
    // Use the stored position
    chartRef.current.style.transition = 'transform 0.5s ease-out';
    setTransform(positionToUse);
    
    // Reset transition after animation completes
    setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.style.transition = '';
      }
    }, 500);
  } else {
    // If position isn't stored yet, calculate and store it
    storeInitialRootPosition();
    
    // Then use it (after a slight delay to allow state to update)
    setTimeout(() => {
      if (initialRootPosition) {
        chartRef.current.style.transition = 'transform 0.5s ease-out';
        setTransform(initialRootPosition);
        
        // Store in the mode-specific state
        if (isOrganizationMode) {
          setOrgModePosition(initialRootPosition);
        } else {
          setRegularModePosition(initialRootPosition);
        }
        
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.style.transition = '';
          }
        }, 500);
      }
    }, 50);
  }
}, [initialRootPosition, isOrganizationMode, orgModePosition, regularModePosition, chartRef, setTransform, storeInitialRootPosition]);

  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;

    setIsLoading(true);
    setError(null);
    // Reset mode-specific positions when loading completely new data
    setRegularModePosition(null);
    setOrgModePosition(null);

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
      // No automatic centering, just set the data
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
        if (filter.type === 'department' || filter.type === 'organization') {
          const orgFields = ['department', 'organization', 'org', 'role'];
          return orgFields.some(field => {
            if (!n[field]) return false;
            if (Array.isArray(n[field])) {
              return n[field].some(val => 
                val.toString().toLowerCase().includes(filter.value.toLowerCase())
              );
            } else {
              return n[field].toString().toLowerCase().includes(filter.value.toLowerCase());
            }
          });
        }
        
        const value = n[filter.type];
        return value !== null && value !== undefined && 
               value.toString().toLowerCase().includes(filter.value.toLowerCase());
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

  const removeVacantPositions = useCallback((node) => {
    if (!node) return null;
    
    const isVacant = node.person_id === "nan";
    
    if (isVacant) return null;
    
    const newNode = { ...node };
    
    if (node.children && node.children.length > 0) {
      newNode.children = node.children
        .map(removeVacantPositions)
        .filter(Boolean);
    }
    
    return newNode;
  }, []);

  const fetchOrgStructureData = useCallback(async (tableId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/org_structure_data/${tableId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching organization structure data:", error);
      toast.error("Failed to fetch organization data. Please try again.");
      return null;
    }
  }, []);
  
  const processOrganizationData = useCallback((serverResponse) => {
    if (!serverResponse) return null;
    
    const { organization_data } = serverResponse;
    
    const orgMap = new Map();
    organization_data.forEach(org => {
      orgMap.set(org.organization_name, {
        name: org.organization_name,
        role: `${org.member_count} member${org.member_count !== 1 ? 's' : ''}`,
        department: org.departments.join(", "),
        hierarchical_structure: org.path,
        isOrgNode: true,
        memberCount: org.member_count,
        departments: org.departments,
        level: org.level,
        children: [],
      });
    });
    
    organization_data.forEach(org => {
      if (org.parent) {
        const parentNode = orgMap.get(org.parent);
        const currentNode = orgMap.get(org.organization_name);
        if (parentNode && currentNode) {
          parentNode.children.push(currentNode);
        }
      }
    });
    
    const rootOrgs = organization_data
      .filter(org => org.parent === null)
      .map(org => orgMap.get(org.organization_name))
      .filter(Boolean);
    
    orgMap.forEach(org => {
      if (org.children.length > 0) {
        org.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    
    if (rootOrgs.length > 1) {
      return {
        name: "All Organizations",
        organization_name: "All Organizations",
        role: `${rootOrgs.length} organizations`,
        hierarchical_structure: "/",
        isOrgNode: true,
        children: rootOrgs.sort((a, b) => a.name.localeCompare(b.name))
      };
    } else if (rootOrgs.length === 1) {
      return rootOrgs[0];
    }
    
    return null;
  }, []);
  
  const handleOrganizationMode = useCallback(() => {
    setIsOrganizationMode((prevMode) => {
      const newMode = !prevMode;
      
      if (newMode) {
        setFilteredOrgId(null);
        setOriginalOrgData(null);
        // Don't reset positions, just load org data
        
        setIsLoading(true);
        
        fetchOrgStructureData(selectedTableId)
          .then(data => {
            if (data) {
              const processedOrgData = processOrganizationData(data);
              setOrganizationModeData(processedOrgData);
              setExpandAll(true);
              // No automatic centering - user must click center button
            } else {
              toast.error("Failed to load organization data");
              setIsOrganizationMode(false);
            }
          })
          .catch(error => {
            console.error("Error in organization mode:", error);
            toast.error("Failed to load organization view");
            setIsOrganizationMode(false);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
      
      if (isHierarchyMode) {
        setIsHierarchyMode(false);
      }
      
      return newMode;
    });
  }, [
    fetchOrgStructureData, 
    processOrganizationData, 
    selectedTableId, 
    isHierarchyMode, 
    setExpandAll
  ]);

  const findNodesInTree = useCallback((originalTree, searchResults) => {
    if (!originalTree || !searchResults || searchResults.length === 0) {
      return originalTree;
    }
  
    const targetStructures = new Set(searchResults.map(result => result.hierarchical_structure));
  
    const markNodesInPath = (node, targetStructures) => {
      if (!node) return false;
  
      const isTarget = targetStructures.has(node.hierarchical_structure);
  
      let hasTargetDescendant = false;
      if (node.children) {
        for (let child of node.children) {
          if (markNodesInPath(child, targetStructures)) {
            hasTargetDescendant = true;
          }
        }
      }
  
      node.visible = isTarget || hasTargetDescendant;
      return node.visible;
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
    markNodesInPath(newTree, targetStructures);
  
    const filterVisibleNodes = (node) => {
      if (!node || !node.visible) return null;
  
      const filteredNode = { ...node };
      delete filteredNode.visible;
  
      if (node.children) {
        filteredNode.children = node.children.map(filterVisibleNodes).filter(Boolean);
      }
  
      return filteredNode;
    };
  
    return filterVisibleNodes(newTree);
  }, []);

  useEffect(() => {
    if (orgData && searchResults && searchResults.length > 0) {
      const searchedData = findNodesInTree(orgData, searchResults, filteredSearchResults);
      
      if (searchedData) {
        setFilteredOrgData(searchedData);
        setExpandAll(true);
      } else {
        if (preFilterOrgData) {
          setFilteredOrgData(preFilterOrgData);
          setPreFilterOrgData(null);
        } else {
          setFilteredOrgData(orgData);
        }
        toast.warning("No matching data found");
      }
    }
  }, [
    searchResults, 
    orgData, 
    findNodesInTree, 
    preFilterOrgData, 
    filteredSearchResults,
    setFilteredOrgData, 
    setExpandAll
  ]);
  
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
  
  const handleToggleVacancies = useCallback(() => {
    setHideVacancies(prev => !prev);
  }, []);

  const handleSwapNodesWithRerender = useCallback((parentId, node1Id, node2Id) => {
    handleSwapNodes(parentId, node1Id, node2Id);
    setSwapKey(prev => prev + 1);
    setTimeout(() => {
      const parentElement = document.getElementById(`node-${parentId}`);
      if (parentElement) {
        const childContainer = parentElement.closest('.flex-col').querySelector('.pt-8');
        if (childContainer) {
          const connections = childContainer.querySelectorAll('.bg-gray-400');
          connections.forEach(conn => {
            conn.style.opacity = '0.99';
            conn.style.opacity = '1';
          });
        }
      }
    }, 50);
  }, [handleSwapNodes]);

  const handleBackgroundClick = useCallback((e) => {
    if (e.target === e.currentTarget && selectedSwapNode) {
      handleCancelSwap();
    }
  }, [selectedSwapNode, handleCancelSwap]);

  // This is the only way centering should happen - user explicitly clicks the center button
  const handleCenter = useCallback(() => {
    centerOnRoot();
  }, [centerOnRoot]);
  
  const handleHome = useCallback(() => {
    setSelectedNode(null);
    handleCenter();
    onReturnToLanding();
  }, [handleCenter, onReturnToLanding]);

  const handleFilterByOrg = useCallback((orgName) => {
    if (!orgName) return;
    
    if (!preFilterOrgData) {
      setPreFilterOrgData(orgData);
    }
    
    setIsOrganizationMode(false);
    setIsLoading(true);
    
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
            toast.info(`Showing people in "${orgName}" organization`);
          } else {
            toast.warning(`No people found in "${orgName}" organization`);
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
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
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
    setExpandAll
  ]);

  
  const handleNodeClick = useCallback((node, isOrgFilter = false) => {
    if (isOrgFilter && node.isOrgNode) {
      if (filteredOrgId === node.hierarchical_structure) {
        setFilteredOrgId(null);
        if (originalOrgData) {
          setFilteredOrgData(originalOrgData);
        }
        toast.info(`Showing all organizations`);
      } else {
        if (!originalOrgData) {
          setOriginalOrgData(filteredOrgData);
        }
        setFilteredOrgId(node.hierarchical_structure);
        const filterOrgOnly = (rootNode) => {
          if (!rootNode) return null;
          if (rootNode.hierarchical_structure === node.hierarchical_structure) {
            return { ...rootNode };
          }
          if (rootNode.children && rootNode.children.length > 0) {
            const filteredChildren = rootNode.children
              .map(filterOrgOnly)
              .filter(Boolean);
            if (filteredChildren.length > 0) {
              return {
                ...rootNode,
                children: filteredChildren
              };
            }
          }
          return null;
        };
        
        const rootData = organizationModeData || originalOrgData || filteredOrgData;
        const filteredData = filterOrgOnly(rootData);
        
        if (filteredData) {
          setFilteredOrgData(filteredData);
          toast.info(`Filtered to show ${node.name} organization`);
        } else {
          toast.error("Could not filter to the selected organization");
        }
      }
    } else {
      setSelectedNode({ ...node, folderId: selectedFolderId, tableId: selectedTableId });
    }
  }, [
    filteredOrgId, 
    originalOrgData, 
    filteredOrgData,
    organizationModeData, 
    selectedFolderId, 
    selectedTableId
  ]);
  
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

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
  }, [setExpandAll]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  }, [setExpandAll]);

  const handleHierarchyMode = useCallback(() => {
    setIsHierarchyMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        // Don't reset position when switching to hierarchy mode
        
        const processHierarchyMode = (node) => {
          if (!node) return null;
          const newNode = { ...node };

          if (node.children && node.children.length > 0) {
            newNode.children = node.children.map(processHierarchyMode).filter(Boolean);
          }

          return node.children && node.children.length > 0 ? newNode : null;
        };

        const hierarchyTree = processHierarchyMode(filteredOrgData);
        
        if (hierarchyTree) {
          setHierarchyModeData(hierarchyTree);
        } else {
          setHierarchyModeData(filteredOrgData);
          toast.warning("No hierarchical structure to display in Hierarchy Mode. Showing full tree.");
        }
        
        // No automatic centering - user must click center button
      }
      
      if (isOrganizationMode) {
        setIsOrganizationMode(false);
      }
      
      return newMode;
    });
  }, [filteredOrgData, isOrganizationMode]);

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
    
    // No automatic centering - user must click center button
  }, [orgData, setActiveFilters]);
  
  const handleTreeSearch = useCallback((term) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setTreeSearchResults([]);
      setCurrentTreeSearchIndex(-1);
      return;
    }
    
    const results = renderedNodes.filter(node => {
      const nameMatch = node.name && node.name.toLowerCase().includes(term.toLowerCase());
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
    
    // No automatic centering - user must click center button
  }, [setActiveFilters]);
  
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
    setActiveFilters, 
    setExpandAll, 
    setFilteredOrgData, 
    setPreFilterOrgData
  ]);
  
  useEffect(() => {
    if (!isOrganizationMode) {
      if (preFilterOrgData && !searchResults && activeFilters.length === 0) {
        setFilteredOrgData(preFilterOrgData);
        setPreFilterOrgData(null);
      }
    }
  }, [
    isOrganizationMode, 
    preFilterOrgData, 
    searchResults, 
    activeFilters.length
  ]);
  
  useEffect(() => {
    if (orgData && searchResults && searchResults.length > 0) {
      const searchedData = findNodesInTree(orgData, searchResults);
      
      if (searchedData) {
        setFilteredOrgData(searchedData);
        setExpandAll(true);
      } else {
        if (preFilterOrgData) {
          setFilteredOrgData(preFilterOrgData);
          setPreFilterOrgData(null);
        } else {
          setFilteredOrgData(orgData);
        }
        toast.warning("No matching data found");
      }
    }
  }, [
    searchResults, 
    orgData, 
    findNodesInTree, 
    preFilterOrgData, 
    setFilteredOrgData, 
    setExpandAll
  ]);

  // Modified effect to store initial position once tree is loaded and rendered
  // Now it checks for mode-specific positions before calculating
  useEffect(() => {
    if (!isLoading && 
        (filteredOrgData || organizationModeData || hierarchyModeData)) {
      
      // Check if we already have a position for this mode
      const hasPositionForCurrentMode = 
        (isOrganizationMode && orgModePosition) ||
        (!isOrganizationMode && regularModePosition);
      
      if (!hasPositionForCurrentMode) {
        // Wait for DOM to be fully rendered, then calculate (but don't apply) position
        const timer = setTimeout(() => {
          storeInitialRootPosition();
          
          // Store this position in the appropriate mode-specific state
          if (initialRootPosition) {
            if (isOrganizationMode) {
              setOrgModePosition(initialRootPosition);
            } else {
              setRegularModePosition(initialRootPosition);
            }
          }
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [
    isLoading,
    filteredOrgData, 
    organizationModeData, 
    hierarchyModeData,
    isOrganizationMode,
    regularModePosition,
    orgModePosition,
    storeInitialRootPosition,
    initialRootPosition
  ]);

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

  const handleFileUpload = async (uploadedData) => {
    setSelectedTableId(uploadedData.table_id);
    setSelectedFolderId(uploadedData.folder_id);
    // Reset mode-specific positions on new file upload
    setRegularModePosition(null);
    setOrgModePosition(null);
    await fetchData();
    setIsUploadOpen(false);
  };
  
  const handleTableSelection = useCallback(async (tableId, folderId) => {
    setSelectedTableId(tableId);
    setSelectedFolderId(folderId);
    // Reset mode-specific positions on table change
    setRegularModePosition(null);
    setOrgModePosition(null);
    await fetchData();
    setIsTableSelectionOpen(false);
  }, [fetchData]);

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

  const handleKeyDown = useCallback((e) => {
    if (isUpdateModalOpen || isFilterOpen) return;

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
      'j': handleHierarchyMode,
      'o': handleOrganizationMode,
      'f': toggleSearchBar,
      'v': handleToggleVacancies
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
    handleHierarchyMode,
    handleOrganizationMode,
    handleToggleVacancies,
    toggleSearchBar,
    setIsTableSelectionOpen,
    setIsUploadOpen,
    setTransform
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (orgData) {
      try {
        let processedData = orgData;
        
        if (hideVacancies) {
          processedData = removeVacantPositions(processedData);
          if (!processedData) {
            toast.warning("No data available after hiding vacant positions.");
            processedData = orgData;
            setHideVacancies(false);
          }
        }
        
        if (searchResults && searchResults.length > 0) {
          const searchedData = findNodesInTree(processedData, searchResults);
          setFilteredOrgData(searchedData || processedData);
          setExpandAll(!!searchedData);
        } else if (activeFilters.length > 0) {
          const filtered = filterOrgData(processedData, activeFilters);
          setFilteredOrgData(filtered || processedData);
          setExpandAll(!!filtered);
        } else {
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

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
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

  useEffect(() => {
    if (!isOrganizationMode) {
      if (preFilterOrgData && activeFilters.length === 0) {
        setFilteredOrgData(preFilterOrgData);
        setPreFilterOrgData(null);
      }
    }
  }, [isOrganizationMode, preFilterOrgData, activeFilters]);

  useEffect(() => {
    if (orgData && searchResults && searchResults.length > 0) {
      const searchedData = findNodesInTree(orgData, searchResults);
      
      if (searchedData) {
        setFilteredOrgData(searchedData);
        setExpandAll(true);
      } else {
        if (preFilterOrgData) {
          setFilteredOrgData(preFilterOrgData);
          setPreFilterOrgData(null);
        } else {
          setFilteredOrgData(orgData);
        }
        toast.warning("No matching data found");
      }
    }
  }, [
    searchResults, 
    orgData, 
    findNodesInTree, 
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
  }, [orgData, setExpandAll]);

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
        <NavigationBar
          onHome={handleHome}
          onCenter={handleCenter}
          onFilter={toggleFilterModal}
          onHierarchyMode={handleHierarchyMode}
          onOrganizationMode={handleOrganizationMode}
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
          isHierarchyMode={isHierarchyMode}
          isOrganizationMode={isOrganizationMode}
          hideVacancies={hideVacancies}
          hasActiveFilters={activeFilters.length > 0 || searchResults}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
          selectedTableId={selectedTableId}
        />
  
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
  
        {selectedSwapNode && !isOrganizationMode && (
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
              {isOrganizationMode ? (
                <OrgNode
                key={`org-tree-${swapKey}`}
                node={organizationModeData || filteredOrgData}
                onNodeClick={handleNodeClick}
                onFilterByOrg={handleFilterByOrg}
                expandAll={expandAll}
                collapseAll={collapseAll}
                folderId={selectedFolderId}
                tableId={selectedTableId}
                searchTerm={searchTerm}
                onNodePosition={(id, x, y) => {
                  const element = document.getElementById(`orgnode-${id}`);
                  if (element) {
                    element.dataset.x = x;
                    element.dataset.y = y;
                  }
                }}
                onNodeRendered={handleNodeRendered}
                onNodeUnrendered={handleNodeUnrendered}
                settings={settings}
              />
              ) : (
                <TreeNode
                  key={`tree-${swapKey}`}
                  node={isHierarchyMode ? 
                        (hierarchyModeData || filteredOrgData) : 
                        filteredOrgData}
                  onNodeClick={handleNodeClick}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  folderId={selectedFolderId}
                  tableId={selectedTableId}
                  highlightedNodes={highlightedNodes}
                  onHighlight={handleHighlight}
                  isHierarchyMode={isHierarchyMode}
                  isOrganizationMode={false}
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
              )}
            </div>
          </div>
        </div>
  
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