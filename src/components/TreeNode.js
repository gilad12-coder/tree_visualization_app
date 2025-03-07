import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertCircle, XCircle, Users, Move, X, ExternalLink } from 'react-feather';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';

// Default color if none is specified in settings
const DEFAULT_NODE_COLOR = '#F5F7FA'; 

// Track expanded states globally to preserve across swaps
const expandedNodesMap = new Map();

const TreeNode = ({ 
  node, 
  onNodeClick, 
  depth = 0, 
  expandAll, 
  collapseAll, 
  folderId, 
  tableId,
  highlightedNodes,
  onHighlight,
  isOrgMode,
  searchTerm,
  searchResults = [],
  currentSearchIndex,
  onNodePosition,
  onNodeRendered,
  onNodeUnrendered,
  filteredSearchResults = [],
  directSearchResults = [],
  duplicatePersonIds = {},
  settings = {},
  onReorder,
  nodeOrder,
  parentNodeId,
  selectedSwapNode = null,
  onSelectForSwap = null,
  onSwapNodes = null,
  onCancelSwap = null
}) => {
  // Use global expanded state map to persist expansion across swaps
  const nodeKey = node?.hierarchical_structure || `${depth}-${parentNodeId}-${node?.name}`;
  const [isExpanded, setIsExpanded] = useState(() => {
    return expandedNodesMap.has(nodeKey) ? expandedNodesMap.get(nodeKey) : false;
  });
  
  const nodeRef = useRef(null);
  const isRendered = useRef(false);
  const [showSwapSuccess, setShowSwapSuccess] = useState(false);
  
  // Long-press for node swapping
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  
  // Button for opening node modal
  const NodeButton = useCallback(({ onClick }) => (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className="p-1 rounded-full bg-white hover:bg-white border border-gray-200 
                 shadow-sm hover:shadow transition-all duration-200 opacity-80 
                 group-hover:opacity-100 z-50 cursor-pointer"
    >
      <ExternalLink 
        size={16} 
        className="text-gray-500 hover:text-gray-700 transition-colors duration-200" 
      />
    </motion.div>
  ), []);
  
  // Check if this node is currently selected for swapping
  const isSelectedForSwap = selectedSwapNode && node && 
    node.hierarchical_structure === selectedSwapNode.hierarchical_structure;
  
  // Check if node can be swapped with selected node (must have same parent)
  const canSwapWith = selectedSwapNode && node && 
    parentNodeId && selectedSwapNode.parentNodeId === parentNodeId &&
    selectedSwapNode.hierarchical_structure !== node.hierarchical_structure;
  
  const hasChildren = node?.children && Array.isArray(node.children) && node.children.length > 0;
  const isSingleChild = hasChildren && node.children.length === 1;
  
  // Use the node color from settings, or fall back to default
  const nodeColor = settings.nodeColor || DEFAULT_NODE_COLOR;
  
  const primaryField = settings.primaryField || 'name';
  const secondaryField = settings.secondaryField || 'role';
  const displayPrimaryField = isOrgMode ? 
    (primaryField === 'name' ? 'role' : (primaryField === 'role' ? 'name' : primaryField)) : 
    primaryField;
  
  const displaySecondaryField = isOrgMode ? 
    (secondaryField === 'role' ? 'name' : (secondaryField === 'name' ? 'role' : secondaryField)) : 
    secondaryField;
  
  const primaryValue = node?.[displayPrimaryField] || `No ${displayPrimaryField}`;
  const secondaryValue = node?.[displaySecondaryField] || `No ${displaySecondaryField}`;

  const primaryLanguage = getLanguage(primaryValue);
  const secondaryLanguage = getLanguage(secondaryValue);

  const isHighlighted = node?.hierarchical_structure ? highlightedNodes.includes(node.hierarchical_structure) : false;
  const isSearchResult = searchTerm && node && (
    Object.entries(node).some(([key, value]) => 
      typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const isCurrentSearchResult = isSearchResult && searchResults[currentSearchIndex] === node?.hierarchical_structure;
  const isDirectSearchResult = node?.hierarchical_structure && directSearchResults.includes(node.hierarchical_structure);
  const hasDuplicateRoles = node?.person_id && duplicatePersonIds[node.person_id] > 1;
  const isDead = node?.is_dead?.toLowerCase() === 'dead';
  const isStatusUnknown = node?.is_dead?.toLowerCase() === 'unknown';

  // Save expanded state to global map when it changes
  useEffect(() => {
    if (nodeKey) {
      expandedNodesMap.set(nodeKey, isExpanded);
    }
  }, [isExpanded, nodeKey]);

  // Handle expandAll/collapseAll
  useEffect(() => {
    if (expandAll) {
      setIsExpanded(true);
    } else if (collapseAll) {
      setIsExpanded(false);
    }
  }, [expandAll, collapseAll]);

  useEffect(() => {
    const updatePosition = () => {
      if (nodeRef.current && node?.hierarchical_structure) {
        const rect = nodeRef.current.getBoundingClientRect();
        onNodePosition(node.hierarchical_structure, rect.left, rect.top);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [node, onNodePosition]);

  useEffect(() => {
    if (node && !isRendered.current) {
      onNodeRendered(node);
      isRendered.current = true;
    }

    return () => {
      if (node && isRendered.current) {
        onNodeUnrendered(node.hierarchical_structure);
        isRendered.current = false;
      }
    };
  }, [node, onNodeRendered, onNodeUnrendered]);

  // Effect to ensure connections rebuild
  useEffect(() => {
    if (nodeRef.current && hasChildren && isExpanded) {
      // Small timeout to ensure DOM has updated
      const timer = setTimeout(() => {
        const childContainer = nodeRef.current.parentElement.querySelector('[class*="pt-8"]');
        if (childContainer) {
          // Force layout recalculation
          childContainer.style.opacity = '0.99';
          // eslint-disable-next-line no-unused-vars
          const forceReflow = childContainer.offsetHeight;
          childContainer.style.opacity = '1';
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodeOrder, hasChildren, isExpanded]);

  // Show swap success feedback briefly after a swap
  useEffect(() => {
    let successTimer;
    if (showSwapSuccess) {
      successTimer = setTimeout(() => {
        setShowSwapSuccess(false);
      }, 1500);
    }
    return () => clearTimeout(successTimer);
  }, [showSwapSuccess]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    // Capture the current ref value
    const currentLongPressTimer = longPressTimer.current;
    
    return () => {
      if (currentLongPressTimer) {
        clearTimeout(currentLongPressTimer);
      }
    };
  }, []);

  // Handle left click - expands/collapses the hierarchy
  const handleLeftClick = useCallback((e) => {
    if (!node || !hasChildren) return;
    
    // Only toggle expansion for left clicks
    if (e.button === 0) {
      setIsExpanded(prev => !prev);
    }
    
    // If a swap is in progress, handle it
    if (selectedSwapNode && canSwapWith) {
      onSwapNodes(
        parentNodeId, 
        selectedSwapNode.hierarchical_structure, 
        node.hierarchical_structure
      );
      setShowSwapSuccess(true);
    } else if (!isSelectedForSwap && selectedSwapNode) {
      onCancelSwap?.();
    }
  }, [
    node, 
    hasChildren, 
    selectedSwapNode,
    canSwapWith,
    isSelectedForSwap,
    onSwapNodes,
    parentNodeId,
    onCancelSwap
  ]);
  
  // Handle right click - highlights the node
  const handleRightClick = useCallback((e) => {
    e.preventDefault(); // Prevent the browser context menu
    e.stopPropagation();
    
    if (node?.hierarchical_structure) {
      // Highlight the node on right-click
      onHighlight(node.hierarchical_structure);
    }
  }, [node, onHighlight]);
  
  // Handle long press for node swapping
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || !node) return;
    isLongPress.current = false;
    
    // Start long press timer for node selection for swapping
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      
      if (onSelectForSwap && parentNodeId) {
        // Select this node for swapping
        onSelectForSwap({
          hierarchical_structure: node.hierarchical_structure,
          parentNodeId: parentNodeId
        });
      }
    }, 600);
  }, [node, onSelectForSwap, parentNodeId]);
  
  // Handle mouse up to clear the long press timer
  const handleMouseUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  // Handle modal opening via the dedicated button
  const handleModalOpen = useCallback((e) => {
    e.stopPropagation(); // Prevent triggering the node click
    e.preventDefault(); // Prevent any default behavior
    
    if (node) {
      // Open the modal by calling the provided onNodeClick function
      onNodeClick({
        ...node,
        folderId: folderId || node.folderId,
        tableId: tableId || node.tableId
      });
    }
  }, [node, onNodeClick, folderId, tableId]);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleToggleExpand = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const cancelSwap = useCallback((e) => {
    e.stopPropagation();
    onCancelSwap?.();
  }, [onCancelSwap]);

  const highlightText = (text, term) => {
    if (!text || !term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === term.toLowerCase() ? 
        <span key={index} className="bg-yellow-300">{part}</span> : part
    );
  };

  // Sort children if order is available
  const sortedChildren = hasChildren && node.children ? [...node.children] : [];
  if (hasChildren && nodeOrder && nodeOrder[node.hierarchical_structure]) {
    const orderMap = nodeOrder[node.hierarchical_structure].reduce((acc, id, index) => {
      acc[id] = index;
      return acc;
    }, {});
    
    sortedChildren.sort((a, b) => {
      const aIndex = orderMap[a.hierarchical_structure] !== undefined ? orderMap[a.hierarchical_structure] : 999;
      const bIndex = orderMap[b.hierarchical_structure] !== undefined ? orderMap[b.hierarchical_structure] : 999;
      return aIndex - bIndex;
    });
  }

  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        id={`node-${node.hierarchical_structure}`}
        ref={nodeRef}
        whileHover={{ scale: 1.02 }}
        animate={{
          scale: isSelectedForSwap ? 1.1 : (showSwapSuccess ? 1.05 : 1),
          boxShadow: isSelectedForSwap 
            ? '0 10px 25px rgba(0,0,0,0.2)' 
            : (showSwapSuccess 
                ? '0 0 15px rgba(34,197,94,0.6)' 
                : '0 1px 3px rgba(0,0,0,0.1)')
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
        style={{ 
          backgroundColor: showSwapSuccess ? '#ecfdf5' : nodeColor,
          borderColor: isDead 
            ? '#4A5568' 
            : (isStatusUnknown 
                ? '#ECC94B' 
                : showSwapSuccess 
                  ? '#22c55e' 
                  : 'rgba(0,0,0,0.1)'),
          zIndex: isSelectedForSwap ? 50 : (showSwapSuccess ? 40 : 10),
          cursor: canSwapWith 
            ? 'pointer' 
            : (isSelectedForSwap ? 'not-allowed' : 'pointer')
        }}
        className={`rounded-xl shadow-sm p-4 w-72 relative overflow-hidden group
          ${isCurrentSearchResult ? 'ring-4 ring-orange-500 shadow-lg' : ''}
          ${isDead ? 'opacity-70 grayscale' : ''}
          ${isStatusUnknown ? 'border-2 border-dashed' : ''}
          ${isDead ? 'border-2' : ''}
          ${hasDuplicateRoles ? 'ring-2 ring-indigo-600' : ''}
          ${isSelectedForSwap ? 'shadow-xl border-2 border-blue-400' : ''}
          ${canSwapWith ? 'ring-2 ring-green-500' : ''}
          ${showSwapSuccess ? 'border-2 border-green-500' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleLeftClick}
        onContextMenu={handleRightClick}
        onMouseLeave={handleMouseLeave}
      >
        {/* Swap indicator */}
        {(isSelectedForSwap || canSwapWith) && (
          <div className="absolute top-1/2 left-2 -translate-y-1/2 opacity-100 transition-opacity z-20">
            <Move size={16} className={`${isSelectedForSwap ? 'text-blue-500' : 'text-green-500'}`} />
          </div>
        )}
        
        {/* Cancel swap button (X) */}
        {isSelectedForSwap && (
          <div 
            className="absolute top-2 right-2 bg-red-100 rounded-full p-1 cursor-pointer z-50 hover:bg-red-200"
            onClick={cancelSwap}
          >
            <X size={14} className="text-red-600" />
          </div>
        )}

        {/* Status indicators */}
        {!isSelectedForSwap && (
          <div className="absolute top-2 right-2 flex space-x-1">
            {isStatusUnknown && (
              <AlertCircle size={18} className="text-yellow-600" />
            )}
            {isDead && (
              <XCircle size={18} className="text-gray-700" />
            )}
            {hasDuplicateRoles && (
              <Users size={18} className="text-indigo-600" />
            )}
          </div>
        )}
        
        <AnimatePresence>
          {(isHighlighted || isSearchResult || isDirectSearchResult) && !isSelectedForSwap && !canSwapWith && !showSwapSuccess && (
            <motion.div
              className="absolute inset-0 border-2 border-black rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
        
        {isCurrentSearchResult && !isSelectedForSwap && !canSwapWith && !showSwapSuccess && (
          <div className="absolute inset-0 bg-orange-200 opacity-30 rounded-xl" />
        )}
        
        {showSwapSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 py-1 bg-green-500 text-white text-xs font-medium text-center"
          >
            Position swapped
          </motion.div>
        )}
        
        <div className={`flex justify-between items-center mb-2 ${primaryLanguage !== 'default' ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 
            className={`text-lg font-bold ${isDead ? 'text-gray-700 line-through' : 'text-black'} ${getFontClass(primaryLanguage)}`}
            dir={getTextDirection(primaryLanguage)}
          >
            {highlightText(primaryValue, searchTerm)}
          </h3>
          <div className="flex items-center gap-2">
            {/* Use the NodeButton component with the handler */}
            <div 
              className="relative" 
              onClick={(e) => e.stopPropagation()}
            >
              <NodeButton onClick={handleModalOpen} />
            </div>
            {hasChildren && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(e);
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={20} className="text-black" />
                ) : (
                  <ChevronRight size={20} className="text-black" />
                )}
              </motion.div>
            )}
          </div>
        </div>
        <div 
          className={`text-sm font-medium ${isDead ? 'text-gray-700' : 'text-black'} ${getFontClass(secondaryLanguage)} text-center`}
          dir={getTextDirection(secondaryLanguage)}
        >
          {highlightText(secondaryValue, searchTerm)}
        </div>
        
        {/* Status text */}
        <div className="mt-2 text-xs text-center font-medium flex flex-col gap-1">
          {isDead && !isSelectedForSwap && !canSwapWith && (
            <span className="text-gray-700">Deceased</span>
          )}
          {isStatusUnknown && !isSelectedForSwap && !canSwapWith && (
            <span className="text-yellow-600">Status Unknown</span>
          )}
          {hasDuplicateRoles && !isSelectedForSwap && !canSwapWith && (
            <span className="text-indigo-600">Multiple Roles</span>
          )}
          {isSelectedForSwap && (
            <span className="text-blue-600 animate-pulse">Click another node to swap</span>
          )}
          {canSwapWith && (
            <span className="text-green-600">Click to swap positions</span>
          )}
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative mt-4 pt-8 w-full"
            key={`children-${node.hierarchical_structure}`}
          >
            <div className={`absolute left-1/2 -translate-x-px w-1 bg-gray-400 ${isSingleChild ? 'h-16' : 'h-8'} top-0`} />
            <div className={`relative flex justify-center ${isSingleChild ? 'mt-10' : ''}`}>
              {sortedChildren.map((child, index, array) => {
                // Calculate the proper line connections based on array position
                const isFirst = index === 0;
                const isLast = index === array.length - 1;
                const isSolo = array.length === 1;
                
                return (
                  <div key={child.hierarchical_structure || `${depth}-${index}`} className="flex flex-col items-center px-4 relative">
                    {!isSingleChild && !isSolo && (
                      <>
                        {isFirst && (
                          <div className="absolute w-1/2 h-1 bg-gray-400 right-0 top-0" />
                        )}
                        {isLast && (
                          <div className="absolute w-1/2 h-1 bg-gray-400 left-0 top-0" />
                        )}
                        {!isFirst && !isLast && (
                          <div className="absolute w-full h-1 bg-gray-400 top-0" />
                        )}
                      </>
                    )}
                    {!isSingleChild && <div className="w-1 bg-gray-400 h-8 mb-4" />}
                    <TreeNode 
                      node={child} 
                      onNodeClick={onNodeClick} 
                      depth={depth + 1} 
                      expandAll={expandAll}
                      collapseAll={collapseAll}
                      folderId={folderId}
                      tableId={tableId}
                      highlightedNodes={highlightedNodes}
                      onHighlight={onHighlight}
                      isOrgMode={isOrgMode}
                      searchTerm={searchTerm}
                      searchResults={searchResults}
                      currentSearchIndex={currentSearchIndex}
                      onNodePosition={onNodePosition}
                      onNodeRendered={onNodeRendered}
                      onNodeUnrendered={onNodeUnrendered}
                      filteredSearchResults={filteredSearchResults}
                      directSearchResults={directSearchResults}
                      duplicatePersonIds={duplicatePersonIds}
                      settings={settings}
                      onReorder={onReorder}
                      nodeOrder={nodeOrder}
                      parentNodeId={node.hierarchical_structure}
                      selectedSwapNode={selectedSwapNode}
                      onSelectForSwap={onSelectForSwap}
                      onSwapNodes={onSwapNodes}
                      onCancelSwap={onCancelSwap}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TreeNode;