import React, { useState, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { List, Upload } from "react-feather";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import { useOrgChartContext } from "../context/OrgChartContext";
import FilterModal from "../modals/FilterModal";
import TreeNode from "../node/TreeNode";
import EnhancedNodeCard from "../node/EnhancedNodeCard";
import Button from "../common/Button";
import FileUploadModal from "../modals/FileUploadModal";
import TableSelectionModal from "../modals/TableSelectionModal";
import SettingsModal from "../settings/SettingsModal.js";
import SearchBar from '../common/SearchBar.js';
import NavigationBar from "../layout/NavigationBar.js";
import OrgNode from '../node/OrgNode';
import NodeEditorModal from '../node/NodeEditorModal';
import NodeContextMenu from '../node/NodeContextMenu';
import { addNode, updateNode, deleteNode } from '../../Utilities/api';

import {
  useDataFetching,
  useDataProcessing,
  useTransformHandlers,
  useModeHandlers,
  useSearchAndFilter,
  useNodeInteractions,
  useUIState
} from './hooks';

const OrgChart = ({ dbPath, initialTableId, initialFolderId, onReturnToLanding }) => {
  const { t } = useTranslation();
  const [orgData, setOrgData] = useState(null);
  const [filteredOrgData, setFilteredOrgData] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [folderStructure, setFolderStructure] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Node editor state
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false);
  const [nodeEditorMode, setNodeEditorMode] = useState('add'); // 'add' or 'edit'
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState(null);
  const [parentNodeForAdd, setParentNodeForAdd] = useState(null);

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState(null);
  const [contextMenuNode, setContextMenuNode] = useState(null);
  const contextMenuNodeRef = useRef(null);

  const {
    expandAll,
    setExpandAll
  } = useOrgChartContext();

  const {
    transform,
    setTransform,
    initialRootPosition,
    regularModePosition,
    setRegularModePosition,
    orgModePosition,
    setOrgModePosition,
    isDragging,
    dragRef,
    chartRef,
    storeInitialRootPosition,
    centerOnRoot,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  } = useTransformHandlers();

  const {
    fetchData,
    fetchOrgStructureData,
    handleExportExcel,
    handleHighlight: highlightHandler,
    API_BASE_URL
  } = useDataFetching(
    dbPath, 
    selectedTableId, 
    selectedFolderId,
    setIsLoading,
    setError,
    setFolderStructure,
    setOrgData,
    setFilteredOrgData,
    setRegularModePosition,
    setOrgModePosition
  );

  const {
    filterOrgData,
    removeVacantPositions,
    processOrganizationData,
    findNodesInTree,
    getParentNode: getParentNodeFn
  } = useDataProcessing();

  const {
    isHierarchyMode,
    isOrganizationMode,
    setIsOrganizationMode,
    hideVacancies,
    setHideVacancies,
    hierarchyModeData,
    organizationModeData,
    handleOrganizationMode,
    handleHierarchyMode,
    handleToggleVacancies
  } = useModeHandlers(
    fetchOrgStructureData,
    processOrganizationData,
    selectedTableId,
    setExpandAll,
    filteredOrgData
  );

  const {
    activeFilters,
    searchResults,
    searchTerm,
    setSearchTerm,
    directSearchResults,
    filteredSearchResults,
    filterModalResetTrigger,
    isSearchBarVisible,
    treeSearchResults,
    currentTreeSearchIndex,
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
  } = useSearchAndFilter(
    API_BASE_URL,
    selectedFolderId,
    selectedTableId,
    orgData,
    setFilteredOrgData,
    setExpandAll,
    setIsOrganizationMode
  );

  const {
    selectedNode,
    setSelectedNode,
    highlightedNodes,
    setHighlightedNodes,
    renderedNodes,
    selectedSwapNode,
    swapKey,
    nodeOrder,
    handleNodeClick,
    handleNodeRendered,
    handleNodeUnrendered,
    handleSelectForSwap,
    handleCancelSwap,
    handleSwapNodesWithRerender,
    handleReorderNodes,
    handleBackgroundClick
  } = useNodeInteractions(
    selectedFolderId,
    selectedTableId
  );

  const {
    isFilterOpen,
    setIsFilterOpen,
    isUploadOpen,
    setIsUploadOpen,
    isTableSelectionOpen,
    setIsTableSelectionOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    activeMenuId,
    setActiveMenuId,
    collapseAll,
    settings,
    setSettings,
    toggleFilterModal,
    handleCloseTableSelection,
    handleExpandAll,
    handleCollapseAll,
    handleExportImage: exportImageHandler,
    handleKeyDown
  } = useUIState(
    setExpandAll,
    () => centerOnRoot(isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData)
  );

  const handleHighlight = (hierarchicalNodeStructure) => {
    highlightHandler(hierarchicalNodeStructure, highlightedNodes, setHighlightedNodes);
  };

  const handleExportImage = () => {
    exportImageHandler(chartRef);
  };

  const handleNodeClickWrapper = (node, isOrgFilter = false) => {
    const updatedData = handleNodeClick(node, isOrgFilter, filteredOrgData, organizationModeData);
    if (updatedData) {
      setFilteredOrgData(updatedData);
    }
  };

  const handleTreeSearchWrapper = (term) => {
    // Include both regular nodes and organization nodes in the search
    const allNodes = [...renderedNodes];
    
    // Add organization nodes if they exist
    if (isOrganizationMode && organizationModeData) {
      const collectOrgNodes = (node, nodes = []) => {
        if (node) {
          nodes.push(node);
          if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => collectOrgNodes(child, nodes));
          }
        }
        return nodes;
      };
      
      const orgNodes = collectOrgNodes(organizationModeData);
      allNodes.push(...orgNodes);
    }
    
    handleTreeSearch(term, allNodes);
  };

  const handleTreeSearchNavigationWrapper = (direction) => {
    const newTransform = handleTreeSearchNavigation(direction, chartRef, transform, settings);
    if (newTransform) {
      setTransform(newTransform);
      chartRef.current.style.transition = 'transform 0.3s ease-out';
      setTimeout(() => {
        chartRef.current.style.transition = '';
      }, 300);
    }
  };

  const handleCenter = () => {
    centerOnRoot(isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData);
  };

  const handleHome = () => {
    setSelectedNode(null);
    handleCenter();
    onReturnToLanding();
  };

  const getParentNode = (hierarchicalStructure) => {
    return getParentNodeFn(hierarchicalStructure, filteredOrgData);
  };

  // Node CRUD handlers
  const handleContextMenu = (e, node) => {
    // Check if clicking the same node that's currently open (using ref only)
    const isSameNode = contextMenuNodeRef.current &&
                       node &&
                       contextMenuNodeRef.current.hierarchical_structure === node.hierarchical_structure;

    console.log('handleContextMenu called:', {
      isSameNode,
      contextMenuOpen,
      currentNodeRef: contextMenuNodeRef.current?.hierarchical_structure,
      clickedNode: node?.hierarchical_structure
    });

    if (isSameNode) {
      console.log('Closing context menu (same node clicked)');
      setContextMenuOpen(false);
      setContextMenuPosition(null);
      setContextMenuNode(null);
      contextMenuNodeRef.current = null;
    } else {
      console.log('Opening context menu (new node or reopening)');
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setContextMenuNode(node);
      contextMenuNodeRef.current = node;
      setContextMenuOpen(true);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenuOpen(false);
    setContextMenuPosition(null);
    setContextMenuNode(null);
    contextMenuNodeRef.current = null;
  };

  const handleAddChild = () => {
    setNodeEditorMode('add');
    setParentNodeForAdd(contextMenuNode);
    setSelectedNodeForEdit(null);
    setIsNodeEditorOpen(true);
    handleCloseContextMenu();
  };

  const handleAddSibling = () => {
    // Find parent of current node by parsing hierarchical structure
    const parentStructure = contextMenuNode.hierarchical_structure.split('/').slice(0, -1).join('/') || '/';
    const parentNode = parentStructure === '/' ? null : findNodeByStructure(filteredOrgData, parentStructure);

    setNodeEditorMode('add');
    setParentNodeForAdd(parentNode || contextMenuNode);
    setSelectedNodeForEdit(null);
    setIsNodeEditorOpen(true);
    handleCloseContextMenu();
  };

  const handleDeleteNode = async () => {
    if (!contextMenuNode) return;

    // Show confirmation dialog
    if (window.confirm(t('nodeOperations.confirmDelete') + '\n' + t('nodeOperations.deleteWarning'))) {
      try {
        await deleteNode(selectedTableId, contextMenuNode.hierarchical_structure);
        toast.success(t('nodeOperations.nodeDeletedSuccess'));
        await fetchData(); // Refresh the tree
        handleCloseContextMenu();
      } catch (error) {
        console.error('Error deleting node:', error);
        toast.error(t('nodeOperations.nodeDeletedError'));
      }
    } else {
      handleCloseContextMenu();
    }
  };

  const handleSaveNode = async (nodeData) => {
    try {
      if (nodeEditorMode === 'add') {
        // Adding a new node
        const parentStructure = parentNodeForAdd?.hierarchical_structure || null;
        await addNode(selectedTableId, parentStructure, nodeData);
        toast.success(t('nodeOperations.nodeAddedSuccess'));
      } else {
        // Editing existing node
        await updateNode(selectedTableId, selectedNodeForEdit.hierarchical_structure, nodeData);
        toast.success(t('nodeOperations.nodeUpdatedSuccess'));
      }

      // Refresh the tree data
      await fetchData();
      setIsNodeEditorOpen(false);
      setSelectedNodeForEdit(null);
      setParentNodeForAdd(null);
    } catch (error) {
      console.error('Error saving node:', error);
      if (nodeEditorMode === 'add') {
        toast.error(t('nodeOperations.nodeAddedError'));
      } else {
        toast.error(t('nodeOperations.nodeUpdatedError'));
      }
    }
  };

  const handleCloseNodeEditor = () => {
    setIsNodeEditorOpen(false);
    setSelectedNodeForEdit(null);
    setParentNodeForAdd(null);
  };

  // Helper function to find node by hierarchical structure
  const findNodeByStructure = (node, structure) => {
    if (!node) return null;
    if (node.hierarchical_structure === structure) return node;

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = findNodeByStructure(child, structure);
        if (found) return found;
      }
    }

    return null;
  };

  // Calculate duplicate person IDs
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
    return Object.fromEntries(
      Object.entries(personIdCounts).filter(([_, count]) => count > 1)
    );
  }, [filteredOrgData]);

  // Handle file upload
  const handleFileUpload = async (uploadedData) => {
    setSelectedTableId(uploadedData.table_id);
    setSelectedFolderId(uploadedData.folder_id);
    // Reset mode-specific positions on new file upload
    setRegularModePosition(null);
    setOrgModePosition(null);
    await fetchData();
    setIsUploadOpen(false);
    // No automatic centering - only user invoked
  };
  
  const handleTableSelection = async (tableId, folderId) => {
    setSelectedTableId(tableId);
    setSelectedFolderId(folderId);
    // Reset mode-specific positions on table change
    setRegularModePosition(null);
    setOrgModePosition(null);
    await fetchData();
    setIsTableSelectionOpen(false);
    // No automatic centering - only user invoked
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchData();
    };
    
    loadInitialData();
  }, [fetchData]);
  
  // No automatic centering effect - centering will only be user-invoked

  useEffect(() => {
    if (orgData) {
      try {
        let processedData = orgData;
        
        if (hideVacancies) {
          processedData = removeVacantPositions(processedData);
          if (!processedData) {
            toast.warning(t('orgChart.noDataAfterHidingVacancies'));
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
        toast.error(t('orgChart.errorProcessingData'));
        setFilteredOrgData(orgData);
        setExpandAll(false);
      }
    }
  }, [orgData, activeFilters, searchResults, hideVacancies, filterOrgData, setExpandAll, findNodesInTree, removeVacantPositions, setHideVacancies, t]);

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

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDownEvent = (e) => {
      handleKeyDown(
        e, 
        isUpdateModalOpen, 
        isFilterOpen, 
        selectedSwapNode, 
        handleCancelSwap, 
        toggleFilterModal, 
        () => setIsSettingsOpen(prev => !prev), // Toggle settings modal
        () => centerOnRoot(isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData), 
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
      );
    };
    
    document.addEventListener("keydown", handleKeyDownEvent);
    return () => {
      document.removeEventListener("keydown", handleKeyDownEvent);
    };
  }, [
    handleKeyDown,
    isUpdateModalOpen,
    isFilterOpen,
    selectedSwapNode,
    handleCancelSwap,
    toggleFilterModal,
    centerOnRoot,
    isOrganizationMode,
    isHierarchyMode,
    organizationModeData,
    hierarchyModeData,
    filteredOrgData,
    handleExpandAll,
    handleCollapseAll,
    handleClearFilter,
    handleHierarchyMode,
    handleOrganizationMode,
    handleToggleVacancies,
    toggleSearchBar,
    setIsTableSelectionOpen,
    setIsUploadOpen,
    setTransform,
    setIsSettingsOpen
  ]);

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
  }, [isOrganizationMode, preFilterOrgData, activeFilters, setPreFilterOrgData]);

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
        toast.warning(t('orgChart.noMatchingData'));
      }
    }
  }, [
    searchResults,
    orgData,
    findNodesInTree,
    preFilterOrgData,
    setFilteredOrgData,
    setExpandAll,
    setPreFilterOrgData,
    t
  ]);

  // Modified effect to store initial position once tree is loaded and rendered
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
          storeInitialRootPosition(
            isOrganizationMode,
            isHierarchyMode,
            organizationModeData,
            hierarchyModeData,
            filteredOrgData
          );
          
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
    isHierarchyMode,
    regularModePosition,
    orgModePosition,
    storeInitialRootPosition,
    initialRootPosition,
    setOrgModePosition,
    setRegularModePosition
  ]);

  // Render loading state
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

  // Render error state
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

  // Render empty state
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
          onOpenHelp={() => {}}
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
  
        <div className="absolute top-18 right-4 rtl:right-auto rtl:left-4 z-10 flex items-center">
          <AnimatePresence>
            {isSearchBarVisible && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                className="mr-2 rtl:mr-0 rtl:ml-2"
              >
                <SearchBar
                  onSearch={handleTreeSearchWrapper}
                  totalResults={treeSearchResults.length}
                  currentResult={currentTreeSearchIndex + 1}
                  onNavigate={handleTreeSearchNavigationWrapper}
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
                  onNodeClick={handleNodeClickWrapper}
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
                  onContextMenu={handleContextMenu}
                />
              ) : (
                <TreeNode
                  key={`tree-${swapKey}`}
                  node={isHierarchyMode ?
                        (hierarchyModeData || filteredOrgData) :
                        filteredOrgData}
                  onNodeClick={handleNodeClickWrapper}
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
                  swapKey={swapKey}
                  onContextMenu={handleContextMenu}
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

        <NodeEditorModal
          isOpen={isNodeEditorOpen}
          onClose={handleCloseNodeEditor}
          onSave={handleSaveNode}
          nodeData={selectedNodeForEdit}
          mode={nodeEditorMode}
          parentNode={parentNodeForAdd}
        />

        <NodeContextMenu
          isOpen={contextMenuOpen}
          position={contextMenuPosition}
          onClose={handleCloseContextMenu}
          onAddChild={handleAddChild}
          onAddSibling={handleAddSibling}
          onDelete={handleDeleteNode}
          node={contextMenuNode}
          canDelete={contextMenuNode?.hierarchical_structure !== '/1'}
        />


      </motion.div>
    </>
  );
};

export default OrgChart;