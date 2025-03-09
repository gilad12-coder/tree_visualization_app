import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Users, Home, Briefcase } from 'react-feather';

const OrgNode = ({ 
  node, 
  onNodeClick, 
  depth = 0, 
  expandAll, 
  collapseAll,
  folderId, 
  tableId,
  searchTerm,
  onNodePosition,
  onNodeRendered,
  onNodeUnrendered,
  settings = {}
}) => {
  // eslint-disable-next-line no-unused-vars
  const nodeKey = node?.hierarchical_structure || `org-${depth}-${node?.name}`;
  const [isExpanded, setIsExpanded] = useState(() => {
    // Default to expanded for organization view
    return true;
  });
  
  const nodeRef = useRef(null);
  const isRendered = useRef(false);
  
  const hasChildren = node?.children && Array.isArray(node.children) && node.children.length > 0;
  const isSingleChild = hasChildren && node.children.length === 1;
  
  const orgColor = useMemo(() => {
    // Generate a consistent color from organization name
    const text = node.name || "Unknown";
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }, [node.name]);
  
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
        onNodePosition?.(node.hierarchical_structure, rect.left, rect.top);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [node, onNodePosition]);

  useEffect(() => {
    if (node && !isRendered.current) {
      onNodeRendered?.(node);
      isRendered.current = true;
    }

    return () => {
      if (node && isRendered.current) {
        onNodeUnrendered?.(node.hierarchical_structure);
        isRendered.current = false;
      }
    };
  }, [node, onNodeRendered, onNodeUnrendered]);

  const handleToggleExpand = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const handleNodeClick = useCallback(() => {
    if (hasChildren) {
      setIsExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const highlightText = (text, term) => {
    if (!text || !term || typeof text !== 'string') return text;
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
        id={`orgnode-${node.hierarchical_structure}`}
        ref={nodeRef}
        whileHover={{ scale: 1.02 }}
        style={{ 
          backgroundColor: 'white',
          borderLeft: `6px solid ${orgColor}`,
        }}
        className="rounded-xl shadow-md p-4 w-80 relative overflow-hidden group cursor-pointer"
        onClick={handleNodeClick}
      >
        <div className="flex items-center gap-2 mb-2">
          <Home size={20} style={{ color: orgColor }} />
          <h3 className="text-lg font-bold text-gray-800">
            {highlightText(node.name, searchTerm)}
          </h3>
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleToggleExpand}
              className="ml-auto cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown size={20} className="text-gray-600" />
              ) : (
                <ChevronRight size={20} className="text-gray-600" />
              )}
            </motion.div>
          )}
        </div>
        
        <div className="mb-2 flex gap-2 items-center">
          <Users size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            {node.memberCount} {node.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        
        {node.departments && node.departments.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 mb-1">
              <Briefcase size={14} className="text-gray-500" />
              <p className="text-xs text-gray-500">Departments:</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {node.departments.map((dept, index) => (
                <span key={index} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {dept}
                </span>
              ))}
            </div>
          </div>
        )}
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
              {node.children.map((child, index, array) => {
                const isFirst = index === 0;
                const isLast = index === array.length - 1;
                const isSolo = array.length === 1;
                
                return (
                  <div key={child.hierarchical_structure || `org-${depth}-${index}`} className="flex flex-col items-center px-4 relative">
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
                    <OrgNode 
                      node={child} 
                      onNodeClick={onNodeClick} 
                      depth={depth + 1} 
                      expandAll={expandAll}
                      collapseAll={collapseAll}
                      folderId={folderId}
                      tableId={tableId}
                      searchTerm={searchTerm}
                      onNodePosition={onNodePosition}
                      onNodeRendered={onNodeRendered}
                      onNodeUnrendered={onNodeUnrendered}
                      settings={settings}
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

export default OrgNode;