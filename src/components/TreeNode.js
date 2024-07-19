// src/components/TreeNode.js
import React, { useState, useEffect } from 'react';
import { motion} from 'framer-motion';
import {User, Mail, Briefcase, Plus, Minus } from 'react-feather';

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
      whileHover={{ y: -4, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      className={`${colorClass} rounded-xl shadow-md transition-all duration-200 ease-out p-5 w-72`}
      onClick={onLeftClick}
      onContextMenu={onRightClick}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-800">{node.name}</h3>
        {node.children && node.children.length > 0 && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            {isExpanded ? (
              <Minus size={20} className="text-gray-600" />
            ) : (
              <Plus size={20} className="text-gray-600" />
            )}
          </motion.div>
        )}
      </div>
      <div className="text-sm font-semibold text-gray-700 flex items-center mb-2">
        <Briefcase size={16} className="mr-2 text-gray-600" />
        {node.role}
      </div>
      {node.department && (
        <div className="text-sm text-gray-600 flex items-center mb-2">
          <User size={16} className="mr-2" />
          {node.department}
        </div>
      )}
      {node.email && (
        <div className="text-sm text-gray-600 flex items-center">
          <Mail size={16} className="mr-2" />
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
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mt-8 flex flex-col items-center"
        >
          <div className="w-px h-16 bg-gray-300"></div>
          <div className="relative flex flex-row justify-center">
            <div className="absolute top-0 h-px w-full bg-gray-300"></div>
            {node.children.map((child, index) => (
              <motion.div
                key={child.id || `${depth}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center mx-6"
              >
                <div className="w-px h-16 bg-gray-300"></div>
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