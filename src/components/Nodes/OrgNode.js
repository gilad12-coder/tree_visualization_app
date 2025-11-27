import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Briefcase, 
  Filter, 
  Layers,
  UserPlus, 
} from 'react-feather';

const OrgNode = ({
  node,
  onNodeClick,
  onFilterByOrg,
  depth = 0,
  expandAll,
  collapseAll,
  folderId,
  tableId,
  searchTerm,
  onNodePosition,
  onNodeRendered,
  onNodeUnrendered,
  settings = {},
  onContextMenu
}) => {
  const [isExpanded, setIsExpanded] = useState(() => true);
  const [isHovered, setIsHovered] = useState(false);

  const nodeRef = useRef(null);
  const isRendered = useRef(false);
  
  const hasChildren = node?.children && Array.isArray(node.children) && node.children.length > 0;
  const isSingleChild = hasChildren && node.children.length === 1;
  
  const orgColor = useMemo(() => {
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
  
  const handleFilter = useCallback((e) => {
    e.stopPropagation();
    if (node.isOrgNode && onFilterByOrg) {
      onFilterByOrg(node.name);
    }
  }, [node, onFilterByOrg]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu && !node.isOrgNode) {
      onContextMenu(e, node);
    }
  }, [node, onContextMenu]);

  const ActionButton = useCallback(({ icon: Icon, onClick, tooltip, className = "" }) => (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`p-1 rounded-full bg-white hover:bg-white border border-gray-200 
                 shadow-sm hover:shadow transition-all duration-200 opacity-80 
                 group-hover:opacity-100 z-50 cursor-pointer relative ${className}`}
    >
      <Icon 
        size={16} 
        className="text-gray-500 hover:text-gray-700 transition-colors duration-200" 
      />
      {tooltip && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </motion.div>
  ), [isHovered]);

  const highlightText = (text, term) => {
    if (!text || !term || typeof text !== 'string') return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === term.toLowerCase() ? 
        <span key={index} className="bg-yellow-300">{part}</span> : part
    );
  };
  
  // Check if this node matches the search term in any of its properties
  const isSearchMatch = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return false;
    
    return Object.entries(node).some(([key, value]) => {
      // Skip non-searchable properties
      if (
        key === 'children' || 
        key === 'hierarchical_structure' || 
        key === 'id' || 
        value === null || 
        value === undefined
      ) {
        return false;
      }
      
      // Handle string values
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      // Handle array values
      if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'string' && 
          item.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Handle object values by converting to string
      if (typeof value === 'object') {
        const stringValue = JSON.stringify(value);
        return stringValue.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      return false;
    });
  }, [node, searchTerm]);

  if (!node) return null;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        id={`node-${node.hierarchical_structure}`}
        ref={nodeRef}
        whileHover={{ scale: 1.02 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleNodeClick}
        onContextMenu={handleContextMenu}
        style={{
          backgroundColor: 'white',
          borderLeft: `5px solid ${orgColor}`,
        }}
        className={`rounded-xl shadow-md p-4 w-80 relative overflow-hidden group cursor-pointer transition-all duration-200 ${isSearchMatch ? 'ring-2 ring-blue-400' : ''}`}
      >
        {/* Node header with name and expand/actions control */}
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: `${orgColor}20` }}
          >
            <Layers size={18} style={{ color: orgColor }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 flex-grow">
            {/* Only highlight the name if it's a match, otherwise highlight other matching fields */}
            {highlightText(node.name, searchTerm)}
          </h3>
          <div className="flex items-center gap-2">
            {/* Action buttons container */}
            {node.isOrgNode && onFilterByOrg && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <ActionButton 
                  icon={Filter} 
                  onClick={handleFilter}
                />
              </div>
            )}
            {hasChildren && (
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.3 }}
                onClick={handleToggleExpand}
                className="cursor-pointer p-1 hover:bg-gray-100 rounded"
              >
                {isExpanded ? (
                  <ChevronDown size={18} className="text-gray-600" />
                ) : (
                  <ChevronRight size={18} className="text-gray-600" />
                )}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* Member count with enhanced styling */}
        <div className="flex items-center gap-2 mb-3 bg-gray-50 py-2 px-3 rounded-md">
          <UserPlus size={15} className="text-gray-500" />
          <span className="text-sm text-gray-700 font-medium">
            {searchTerm && node.memberCount && String(node.memberCount).includes(searchTerm) ? 
              highlightText(String(node.memberCount), searchTerm) : node.memberCount} {node.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        
        {/* Departments section with enhanced styling */}
        {node.departments && node.departments.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-1 mb-2">
              <Briefcase size={14} className="text-gray-500" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Departments</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {node.departments.map((dept, index) => (
                <span 
                  key={index} 
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full"
                  style={{ borderLeft: `2px solid ${orgColor}` }}
                >
                  {searchTerm ? highlightText(dept, searchTerm) : dept}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Children nodes with animations */}
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
            {/* Vertical connector line */}
            <div className={`absolute left-1/2 -translate-x-px w-1 bg-gray-300 ${isSingleChild ? 'h-16' : 'h-8'} top-0`} />
            
            {/* Children container */}
            <div className={`relative flex justify-center ${isSingleChild ? 'mt-10' : ''}`}>
              {node.children.map((child, index, array) => {
                const isFirst = index === 0;
                const isLast = index === array.length - 1;
                const isSolo = array.length === 1;
                
                return (
                  <div key={child.hierarchical_structure || `org-${depth}-${index}`} className="flex flex-col items-center px-4 relative">
                    {/* Horizontal connector lines for multiple children */}
                    {!isSingleChild && !isSolo && (
                      <>
                        {isFirst && (
                          <div className="absolute w-1/2 h-1 bg-gray-300 right-0 top-0" />
                        )}
                        {isLast && (
                          <div className="absolute w-1/2 h-1 bg-gray-300 left-0 top-0" />
                        )}
                        {!isFirst && !isLast && (
                          <div className="absolute w-full h-1 bg-gray-300 top-0" />
                        )}
                      </>
                    )}
                    
                    {/* Vertical connector for each child */}
                    {!isSingleChild && <div className="w-1 bg-gray-300 h-8 mb-4" />}
                    
                    {/* Recursive child OrgNode */}
                    <OrgNode
                      node={child}
                      onNodeClick={onNodeClick}
                      onFilterByOrg={onFilterByOrg}
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
                      onContextMenu={onContextMenu}
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