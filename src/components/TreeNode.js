import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertCircle, XCircle, Users, Move, X, ExternalLink } from 'react-feather';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';

const DEFAULT_NODE_COLOR = '#F5F7FA'; 

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
  isHierarchyMode,
  isOrganizationMode,
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
  const nodeKey = node?.hierarchical_structure || `${depth}-${parentNodeId}-${node?.name}`;
  const [isExpanded, setIsExpanded] = useState(() => {
    return expandedNodesMap.has(nodeKey) ? expandedNodesMap.get(nodeKey) : false;
  });
  
  const nodeRef = useRef(null);
  const isRendered = useRef(false);
  const [showSwapSuccess, setShowSwapSuccess] = useState(false);
  
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  
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
  
  const isSelectedForSwap = selectedSwapNode && node && 
    node.hierarchical_structure === selectedSwapNode.hierarchical_structure;
  
  const canSwapWith = selectedSwapNode && node && 
    parentNodeId && selectedSwapNode.parentNodeId === parentNodeId &&
    selectedSwapNode.hierarchical_structure !== node.hierarchical_structure;
  
  const hasChildren = node?.children && Array.isArray(node.children) && node.children.length > 0;
  const isSingleChild = hasChildren && node.children.length === 1;
  
  const nodeColor = settings.nodeColor || DEFAULT_NODE_COLOR;
  
  const primaryField = settings.primaryField || 'name';
  const secondaryField = settings.secondaryField || 'role';
  const displayPrimaryField = isHierarchyMode ? 
    (primaryField === 'name' ? 'role' : (primaryField === 'role' ? 'name' : primaryField)) : 
    primaryField;
  
  const displaySecondaryField = isHierarchyMode ? 
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

  useEffect(() => {
    if (nodeKey) {
      expandedNodesMap.set(nodeKey, isExpanded);
    }
  }, [isExpanded, nodeKey]);

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

  useEffect(() => {
    if (nodeRef.current && hasChildren && isExpanded) {
      const timer = setTimeout(() => {
        const childContainer = nodeRef.current.parentElement.querySelector('[class*="pt-8"]');
        if (childContainer) {
          childContainer.style.opacity = '0.99';
          childContainer.style.opacity = '1';
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodeOrder, hasChildren, isExpanded]);

  useEffect(() => {
    let successTimer;
    if (showSwapSuccess) {
      successTimer = setTimeout(() => {
        setShowSwapSuccess(false);
      }, 1500);
    }
    return () => clearTimeout(successTimer);
  }, [showSwapSuccess]);

  useEffect(() => {
    const currentLongPressTimer = longPressTimer.current;
    
    return () => {
      if (currentLongPressTimer) {
        clearTimeout(currentLongPressTimer);
      }
    };
  }, []);

  const handleLeftClick = useCallback((e) => {
    if (selectedSwapNode && canSwapWith) {
      onSwapNodes(
        parentNodeId, 
        selectedSwapNode.hierarchical_structure, 
        node.hierarchical_structure
      );
      setShowSwapSuccess(true);
      return;
    } else if (!isSelectedForSwap && selectedSwapNode) {
      onCancelSwap?.();
    }
    
    if (node && hasChildren && e.button === 0) {
      setIsExpanded(prev => !prev);
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
  
  const handleRightClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (node?.hierarchical_structure) {
      onHighlight(node.hierarchical_structure);
    }
  }, [node, onHighlight]);
  
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || !node) return;
    isLongPress.current = false;
    
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      
      if (onSelectForSwap) {
        onSelectForSwap({
          hierarchical_structure: node.hierarchical_structure,
          parentNodeId: parentNodeId
        });
      }
    }, 600);
  }, [node, onSelectForSwap, parentNodeId]);
  
  const handleMouseUp = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleModalOpen = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (node) {
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

  // New function to render organization group
  const renderOrgGroup = (node, children) => {
    if (!isOrganizationMode || !node?.orgInfo) {
      return children;
    }
    
    const { isGroupStart, isGroupEnd, name, color } = node.orgInfo;
    
    // No special rendering needed if not a boundary
    if (!isGroupStart && !isGroupEnd) {
      return children;
    }
    
    // If this is a group start, add a header
    if (isGroupStart) {
      return (
        <div className="relative">
          {/* Organization header */}
          {isGroupStart && (
            <div 
              className="py-2 px-3 mb-2 rounded-t-lg font-medium text-sm" 
              style={{ 
                backgroundColor: color,
                color: 'white',
                opacity: 0.9
              }}
            >
              {name}
            </div>
          )}
          
          {/* Node content */}
          <div
            className="pl-2"
            style={{ 
              borderLeft: `3px solid ${color}`,
            }}
          >
            {children}
          </div>
          
          {/* Group end padding */}
          {isGroupEnd && <div className="h-4" />}
        </div>
      );
    }
    
    // If only a group end, just add some spacing
    return (
      <div>
        {children}
        {isGroupEnd && <div className="h-4" />}
      </div>
    );
  };

  // Sort children based on nodeOrder or organization name when in org mode
  const sortedChildren = useMemo(() => {
    if (!hasChildren || !node.children) return [];
    
    let children = [...node.children];
    
    // Apply organization sorting in organization mode
    if (isOrganizationMode) {
      children.sort((a, b) => {
        const orgA = a.organization_name || 'Unknown';
        const orgB = b.organization_name || 'Unknown';
        return orgA.localeCompare(orgB);
      });
    } 
    // Apply node order sorting
    else if (nodeOrder && nodeOrder[node.hierarchical_structure]) {
      const orderMap = nodeOrder[node.hierarchical_structure].reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
      }, {});
      
      children.sort((a, b) => {
        const aIndex = orderMap[a.hierarchical_structure] !== undefined ? orderMap[a.hierarchical_structure] : 999;
        const bIndex = orderMap[b.hierarchical_structure] !== undefined ? orderMap[b.hierarchical_structure] : 999;
        return aIndex - bIndex;
      });
    }
    
    return children;
  }, [hasChildren, node, nodeOrder, isOrganizationMode]);

  // Render the node with organization groups if needed
  const renderNodeContent = () => {
    const nodeContent = (
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
        {(isSelectedForSwap || canSwapWith) && (
          <div className="absolute top-1/2 left-2 -translate-y-1/2 opacity-100 transition-opacity z-20">
            <Move size={16} className={`${isSelectedForSwap ? 'text-blue-500' : 'text-green-500'}`} />
          </div>
        )}
        
        {isSelectedForSwap && (
          <div 
            className="absolute top-2 right-2 bg-red-100 rounded-full p-1 cursor-pointer z-50 hover:bg-red-200"
            onClick={cancelSwap}
          >
            <X size={14} className="text-red-600" />
          </div>
        )}

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
    );
    
    // Apply organization grouping if in organization mode
    return isOrganizationMode ? renderOrgGroup(node, nodeContent) : nodeContent;
  };

  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      {renderNodeContent()}
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
                      isHierarchyMode={isHierarchyMode}
                      isOrganizationMode={isOrganizationMode}
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