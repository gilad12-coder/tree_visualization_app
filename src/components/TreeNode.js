import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, AlertCircle, XCircle, Users } from 'react-feather';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';

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
  settings = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const nodeRef = useRef(null);
  const isRendered = useRef(false);
  const hasChildren = node?.children && Array.isArray(node.children) && node.children.length > 0;
  const isSingleChild = hasChildren && node.children.length === 1;
  const levelKey = `level${(depth % 5) + 1}`;
  const nodeColor = settings.nodeColors?.[levelKey];
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

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0 || !node) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onHighlight(node.hierarchical_structure);
    }, 500);
  }, [node, onHighlight]);

  const handleMouseUp = useCallback((e) => {
    if (e.button !== 0 || !node) return;
    clearTimeout(longPressTimer.current);
    if (!isLongPress.current) {
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

  const handleToggle = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const highlightText = (text, term) => {
    if (!text || !term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === term.toLowerCase() ? 
        <span key={index} className="bg-yellow-300">{part}</span> : part
    );
  };

  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        id={`node-${node.hierarchical_structure}`}
        ref={nodeRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ 
          backgroundColor: nodeColor,
          borderColor: isDead ? '#4A5568' : (isStatusUnknown ? '#ECC94B' : 'rgba(0,0,0,0.1)')
        }}
        className={`rounded-xl shadow-sm transition-all duration-300 ease-out p-4 w-72 relative z-10 cursor-pointer overflow-hidden
          ${isCurrentSearchResult ? 'ring-4 ring-orange-500 shadow-lg' : ''}
          ${isDead ? 'opacity-70 grayscale' : ''}
          ${isStatusUnknown ? 'border-2 border-dashed' : ''}
          ${isDead ? 'border-2' : ''}
          ${hasDuplicateRoles ? 'ring-2 ring-indigo-600' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleToggle}
      >
        {/* Status indicators */}
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
        
        <AnimatePresence>
          {(isHighlighted || isSearchResult || isDirectSearchResult) && (
            <motion.div
              className="absolute inset-0 border-2 border-black rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
        {isCurrentSearchResult && (
          <div className="absolute inset-0 bg-orange-200 opacity-30 rounded-xl" />
        )}
        <div className={`flex justify-between items-center mb-2 ${primaryLanguage !== 'default' ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 
            className={`text-lg font-bold ${isDead ? 'text-gray-700 line-through' : 'text-black'} ${getFontClass(primaryLanguage)}`}
            dir={getTextDirection(primaryLanguage)}
          >
            {highlightText(primaryValue, searchTerm)}
          </h3>
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(e);
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
        <div 
          className={`text-sm font-medium ${isDead ? 'text-gray-700' : 'text-black'} ${getFontClass(secondaryLanguage)} text-center`}
          dir={getTextDirection(secondaryLanguage)}
        >
          {highlightText(secondaryValue, searchTerm)}
        </div>
        
        {/* Status text */}
        <div className="mt-2 text-xs text-center font-medium flex flex-col gap-1">
          {isDead && (
            <span className="text-gray-700">Deceased</span>
          )}
          {isStatusUnknown && (
            <span className="text-yellow-600">Status Unknown</span>
          )}
          {hasDuplicateRoles && (
            <span className="text-indigo-600">Multiple Roles</span>
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
          >
            <div className={`absolute left-1/2 -translate-x-px w-1 bg-gray-400 ${isSingleChild ? 'h-16' : 'h-8'} top-0`} />
            <div className={`relative flex justify-center ${isSingleChild ? 'mt-10' : ''}`}>
              {node.children.map((child, index, array) => (
                <div key={child.hierarchical_structure || `${depth}-${index}`} className="flex flex-col items-center px-4 relative">
                  {!isSingleChild && (
                    <>
                      {index === 0 && (
                        <div className="absolute w-1/2 h-1 bg-gray-400 right-0 top-0" />
                      )}
                      {index === array.length - 1 && (
                        <div className="absolute w-1/2 h-1 bg-gray-400 left-0 top-0" />
                      )}
                      {index > 0 && index < array.length - 1 && (
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
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TreeNode;