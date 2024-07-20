import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, User, Mail, ChevronRight, ChevronDown } from 'react-feather';

const colors = {
  level1: 'bg-blue-500',
  level2: 'bg-green-500',
  level3: 'bg-purple-500',
  level4: 'bg-yellow-500',
  level5: 'bg-pink-500',
};

const NodeCard = ({ node, onLeftClick, onRightClick, isExpanded, depth }) => {
  const colorClass = colors[`level${(depth % 5) + 1}`];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`${colorClass} bg-opacity-20 rounded-xl shadow-sm transition-all duration-300 ease-out p-6 w-80`}
      onClick={onLeftClick}
      onContextMenu={onRightClick}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-black text-black tracking-tight">{node.name}</h3>
        {node.children && node.children.length > 0 && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-black hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown size={24} />
            ) : (
              <ChevronRight size={24} />
            )}
          </motion.div>
        )}
      </div>
      <div className="space-y-2 text-center">
        <div className="text-sm font-semibold text-black flex justify-center items-center">
          <Briefcase size={16} className="mr-2 text-black" />
          {node.role}
        </div>
        {node.department && (
          <div className="text-sm text-black flex justify-center items-center">
            <User size={16} className="mr-2 text-black" />
            {node.department}
          </div>
        )}
        {node.email && (
          <div className="text-sm text-black flex justify-center items-center">
            <Mail size={16} className="mr-2 text-black" />
            {node.email}
          </div>
        )}
      </div>
      {node.directReports && node.directReports.length > 0 && (
        <div className="text-center mt-4">
          <h4 className="text-lg font-semibold text-black">Direct Reports ({node.directReports.length}):</h4>
          <div className="text-center">
            {node.directReports.map((report, index) => (
              <div key={index} className="text-sm text-black">{report}</div>
            ))}
          </div>
        </div>
      )}
      {node.indirectReports && node.indirectReports.length > 0 && (
        <div className="text-center mt-4">
          <h4 className="text-lg font-semibold text-black">Indirect Reports ({node.indirectReports.length}):</h4>
          <div className="text-center">
            {node.indirectReports.map((report, index) => (
              <div key={index} className="text-sm text-black">{report}</div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NodeCard;
