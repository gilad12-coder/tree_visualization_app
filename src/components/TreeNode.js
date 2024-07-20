import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Briefcase, ChevronDown, ChevronRight } from 'react-feather';

const colors = {
  level1: 'bg-blue-100 border-blue-300',
  level2: 'bg-green-100 border-green-300',
  level3: 'bg-purple-100 border-purple-300',
  level4: 'bg-yellow-100 border-yellow-300',
  level5: 'bg-pink-100 border-pink-300',
};

const NodeCard = ({ node, onLeftClick, onRightClick, isExpanded, depth }) => {
  const colorClass = colors[`level${(depth % 5) + 1}`];

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      className={`${colorClass} rounded-lg border-2 shadow-md transition-all duration-200 ease-out p-4 w-72`}
      onClick={onLeftClick}
      onContextMenu={onRightClick}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{node.name}</h3>
        {node.children && node.children.length > 0 && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {isExpanded ? (
              <ChevronDown size={20} className="text-gray-600" />
            ) : (
              <ChevronRight size={20} className="text-gray-600" />
            )}
          </motion.div>
        )}
      </div>
      <div className="text-sm font-medium text-gray-700 flex items-center mb-1">
        <Briefcase size={14} className="mr-2 text-gray-600" />
        {node.role}
      </div>
      {node.department && (
        <div className="text-sm text-gray-600 flex items-center mb-1">
          <User size={14} className="mr-2 text-gray-600" />
          {node.department}
        </div>
      )}
      {node.email && (
        <div className="text-sm text-gray-600 flex items-center">
          <Mail size={14} className="mr-2 text-gray-600" />
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
      {hasChildren && isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-6 flex flex-col items-center"
        >
          <motion.div 
            className="w-0.5 h-12 bg-gray-400"
            initial={{ height: 0 }}
            animate={{ height: 48 }}
            transition={{ duration: 0.2 }}
          ></motion.div>
          <div className="relative flex flex-row justify-center">
            <motion.div 
              className="absolute top-0 h-0.5 bg-gray-400"
              style={{ left: "-50%", right: "-50%" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.2 }}
            ></motion.div>
            {node.children.map((child, index) => (
              <motion.div
                key={child.id || `${depth}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex flex-col items-center mx-4"
              >
                <motion.div 
                  className="w-0.5 h-12 bg-gray-400"
                  initial={{ height: 0 }}
                  animate={{ height: 48 }}
                  transition={{ duration: 0.2 }}
                ></motion.div>
                <TreeNode 
                  node={child} 
                  onNodeClick={onNodeClick} 
                  depth={depth + 1} 
                  expandAll={expandAll}
                  filterNode={filterNode}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TreeNode;