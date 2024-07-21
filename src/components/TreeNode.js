import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'react-feather';

const colors = {
  level1: 'bg-blue-500 bg-opacity-20',
  level2: 'bg-green-500 bg-opacity-20',
  level3: 'bg-purple-500 bg-opacity-20',
  level4: 'bg-yellow-500 bg-opacity-20',
  level5: 'bg-pink-500 bg-opacity-20',
};

const TreeNode = ({ node, onNodeClick, depth = 0, expandAll, collapseAll, filterNode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const colorClass = colors[`level${(depth % 5) + 1}`];

  useEffect(() => {
    if (expandAll) {
      setIsExpanded(true);
    } else if (collapseAll) {
      setIsExpanded(false);
    }
  }, [expandAll, collapseAll]);

  const handleClick = (e) => {
    e.stopPropagation();
    onNodeClick(node);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  };

  const nodeMatchesFilter = filterNode(node);
  const childrenMatchFilter = hasChildren && node.children.some(filterNode);

  if (!nodeMatchesFilter && !childrenMatchFilter) return null;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${colorClass} rounded-xl shadow-sm transition-all duration-300 ease-out p-4 w-72 relative z-10 cursor-pointer ${
          !nodeMatchesFilter ? 'opacity-50' : ''
        }`}
        onClick={handleClick}
        onContextMenu={handleToggle}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-black">{node.name}</h3>
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleToggle}
            >
              {isExpanded ? (
                <ChevronDown size={20} className="text-black" />
              ) : (
                <ChevronRight size={20} className="text-black" />
              )}
            </motion.div>
          )}
        </div>
        <div className="text-sm font-medium text-black">{node.role}</div>
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
            <div className="absolute left-1/2 -translate-x-px w-0.5 bg-gray-300 h-8 top-0" />
            <div className="relative flex justify-center">
              {node.children.map((child, index, array) => (
                <div key={child.id || `${depth}-${index}`} className="flex flex-col items-center px-4 relative">
                  {index === 0 && array.length > 1 && (
                    <div className="absolute w-1/2 h-0.5 bg-gray-300 right-0 top-0" />
                  )}
                  {index === array.length - 1 && array.length > 1 && (
                    <div className="absolute w-1/2 h-0.5 bg-gray-300 left-0 top-0" />
                  )}
                  {index > 0 && index < array.length - 1 && (
                    <div className="absolute w-full h-0.5 bg-gray-300 top-0" />
                  )}
                  <div className="w-0.5 bg-gray-300 h-8 mb-4" />
                  <TreeNode 
                    node={child} 
                    onNodeClick={onNodeClick} 
                    depth={depth + 1} 
                    expandAll={expandAll}
                    collapseAll={collapseAll}
                    filterNode={filterNode}
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