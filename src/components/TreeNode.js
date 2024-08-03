import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'react-feather';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';

const colors = {
  level1: 'bg-blue-500 bg-opacity-20',
  level2: 'bg-green-500 bg-opacity-20',
  level3: 'bg-purple-500 bg-opacity-20',
  level4: 'bg-yellow-500 bg-opacity-20',
  level5: 'bg-pink-500 bg-opacity-20',
};

const TreeNode = ({ 
  node, 
  onNodeClick, 
  depth = 0, 
  expandAll, 
  collapseAll, 
  filterNode, 
  folderId, 
  tableId,
  highlightedNodes,
  onHighlight
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const colorClass = colors[`level${(depth % 5) + 1}`];
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);
  const nodeRef = useRef(null);

  const nameLanguage = getLanguage(node.name);
  const roleLanguage = getLanguage(node.role);

  const isHighlighted = highlightedNodes.includes(node.name);

  useEffect(() => {
    if (expandAll) {
      setIsExpanded(true);
    } else if (collapseAll) {
      setIsExpanded(false);
    }
  }, [expandAll, collapseAll]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onHighlight(node.name);
    }, 500);
  }, [node.name, onHighlight]);

  const handleMouseUp = useCallback((e) => {
    if (e.button !== 0) return;
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

  const nodeMatchesFilter = filterNode(node);

  if (!nodeMatchesFilter) return null;

  const visibleChildren = hasChildren ? node.children.filter(filterNode) : [];

  return (
    <div className="flex flex-col items-center relative">
      <motion.div
        ref={nodeRef}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${colorClass} rounded-xl shadow-sm transition-all duration-300 ease-out p-4 w-72 relative z-10 cursor-pointer overflow-hidden`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleToggle}
      >
        <AnimatePresence>
          {isHighlighted && (
            <motion.div
              className="absolute inset-0 border-2 border-black rounded-xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
        <div className={`flex justify-between items-center mb-2 ${nameLanguage !== 'default' ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 
            className={`text-lg font-bold text-black ${getFontClass(nameLanguage)}`}
            dir={getTextDirection(nameLanguage)}
          >
            {node.name}
          </h3>
          {visibleChildren.length > 0 && (
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
          className={`text-sm font-medium text-black ${getFontClass(roleLanguage)} text-center`}
          dir={getTextDirection(roleLanguage)}
        >
          {node.role}
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {visibleChildren.length > 0 && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="relative mt-4 pt-8 w-full"
          >
            <div 
              className="absolute left-1/2 -translate-x-px w-1 bg-gray-400 h-8 top-0"
            />
            <div className="relative flex justify-center">
              {visibleChildren.map((child, index, array) => (
                <div key={child.name || `${depth}-${index}`} className="flex flex-col items-center px-4 relative">
                  {index === 0 && array.length > 1 && (
                    <div 
                      className="absolute w-1/2 h-1 bg-gray-400 right-0 top-0"
                    />
                  )}
                  {index === array.length - 1 && array.length > 1 && (
                    <div 
                      className="absolute w-1/2 h-1 bg-gray-400 left-0 top-0"
                    />
                  )}
                  {index > 0 && index < array.length - 1 && (
                    <div className="absolute w-full h-1 bg-gray-400 top-0" />
                  )}
                  <div 
                    className="w-1 bg-gray-400 h-8 mb-4"
                  />
                  <TreeNode 
                    node={child} 
                    onNodeClick={onNodeClick} 
                    depth={depth + 1} 
                    expandAll={expandAll}
                    collapseAll={collapseAll}
                    filterNode={filterNode}
                    folderId={folderId || node.folderId}
                    tableId={tableId || node.tableId}
                    highlightedNodes={highlightedNodes}
                    onHighlight={onHighlight}
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