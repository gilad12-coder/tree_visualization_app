import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Briefcase, ChevronDown, ChevronRight } from 'react-feather';

const colors = {
  level1: 'bg-blue-500 bg-opacity-20',
  level2: 'bg-green-500 bg-opacity-20',
  level3: 'bg-purple-500 bg-opacity-20',
  level4: 'bg-yellow-500 bg-opacity-20',
  level5: 'bg-pink-500 bg-opacity-20',
};

const NodeCard = ({ node, onLeftClick, onRightClick, isExpanded, depth }) => {
  const colorClass = colors[`level${(depth % 5) + 1}`];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`${colorClass} rounded-xl shadow-sm transition-all duration-300 ease-out p-4 w-72`}
      onClick={onLeftClick}
      onContextMenu={onRightClick}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold text-black">{node.name}</h3>
        {node.children && node.children.length > 0 && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {isExpanded ? (
              <ChevronDown size={20} className="text-black" />
            ) : (
              <ChevronRight size={20} className="text-black" />
            )}
          </motion.div>
        )}
      </div>
      <div className="text-sm font-medium text-black flex items-center mb-1">
        <Briefcase size={14} className="mr-2 text-black" />
        {node.role}
      </div>
      {node.department && (
        <div className="text-sm text-black flex items-center mb-1">
          <User size={14} className="mr-2 text-black" />
          {node.department}
        </div>
      )}
      {node.email && (
        <div className="text-sm text-black flex items-center">
          <Mail size={14} className="mr-2 text-black" />
          {node.email}
        </div>
      )}
    </motion.div>
  );
};

const TreeNode = ({ node, onNodeClick, depth = 0, expandAll, filterNode }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  useEffect(() => {
    setIsExpanded(expandAll);
  }, [expandAll]);

  const handleLeftClick = () => {
    onNodeClick(node);
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  // Apply filter
  if (!filterNode(node)) return null;

  return (
    <div className="flex flex-col items-center" id={`node-${node.id || depth}`}>
      <NodeCard 
        node={node} 
        onLeftClick={handleLeftClick} 
        onRightClick={handleRightClick} 
        isExpanded={isExpanded} 
        depth={depth} 
      />
      {hasChildren && (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="flex flex-col items-center relative"
              style={{ overflow: 'hidden' }}
            >
              <motion.div 
                className="w-0.5 bg-blue-500 bg-opacity-20 absolute top-0 bottom-0"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
              <div className="pt-6 flex flex-row justify-center relative w-full">
                <motion.div 
                  className="h-0.5 bg-blue-500 bg-opacity-20 absolute top-6"
                  style={{ left: "50%", right: "0" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
                <motion.div 
                  className="h-0.5 bg-blue-500 bg-opacity-20 absolute top-6"
                  style={{ right: "50%", left: "0" }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
                {node.children.map((child, index) => (
                  <motion.div
                    key={child.id || `${depth}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex flex-col items-center mx-4 relative"
                  >
                    <motion.div 
                      className="w-0.5 h-6 bg-blue-500 bg-opacity-20 absolute top-0"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    />
                    <div className="pt-6">
                      <TreeNode 
                        node={child} 
                        onNodeClick={onNodeClick} 
                        depth={depth + 1} 
                        expandAll={expandAll}
                        filterNode={filterNode}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default TreeNode;