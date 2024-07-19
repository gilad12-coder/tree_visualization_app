import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, User, Mail, Plus, Minus } from 'react-feather';

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
            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
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

export default NodeCard;
