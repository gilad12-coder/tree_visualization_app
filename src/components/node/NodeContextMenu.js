import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, GitBranch, Droplet } from 'react-feather';
import { useTranslation } from 'react-i18next';

const NodeContextMenu = ({
  isOpen,
  position,
  onClose,
  onAddChild,
  onAddSibling,
  onDelete,
  onSetColor,
  node,
  canDelete = true
}) => {
  const { t } = useTranslation();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking the context menu trigger button
      const isContextMenuTrigger = event.target.closest('[data-context-menu-trigger="true"]');

      if (menuRef.current && !menuRef.current.contains(event.target) && !isContextMenuTrigger) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Check if node is root by counting segments in hierarchical_structure
  // Root nodes have only one segment (e.g., /1, /CEO, /Root)
  // Non-root nodes have multiple segments (e.g., /1/2, /CEO/Manager)
  const isRootNode = node?.hierarchical_structure
    ? node.hierarchical_structure.split('/').filter(part => part).length === 1
    : false;

  const menuItems = [
    {
      icon: UserPlus,
      label: t('contextMenu.addChild', 'Add Child Node'),
      action: onAddChild,
      hoverBg: 'hover:bg-gray-50'
    }
  ];

  // Only show "Add Sibling" option if not root node
  if (!isRootNode) {
    menuItems.push({
      icon: GitBranch,
      label: t('contextMenu.addSibling', 'Add Sibling Node'),
      action: onAddSibling,
      hoverBg: 'hover:bg-gray-50'
    });
  }

  // Add color option if handler is provided (only in hierarchy mode)
  if (onSetColor) {
    menuItems.push({
      icon: Droplet,
      label: t('contextMenu.setColor', 'Set Color'),
      action: onSetColor,
      hoverBg: 'hover:bg-blue-50',
      color: 'text-blue-600'
    });
  }

  if (canDelete) {
    menuItems.push({
      icon: Trash2,
      label: t('contextMenu.delete', 'Delete Node'),
      action: onDelete,
      hoverBg: 'hover:bg-red-50',
      color: 'text-red-600',
      divider: true
    });
  }

  // Don't render if no position (needed for AnimatePresence exit animation to work)
  if (!position) return null;

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {menuItems.map((item, index) => (
        <React.Fragment key={index}>
          {item.divider && <div className="my-1 border-t border-gray-100" />}
          <button
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${item.hoverBg}`}
          >
            <item.icon
              size={16}
              className={item.color || 'text-gray-600'}
            />
            <span className="text-sm text-gray-700">
              {item.label}
            </span>
          </button>
        </React.Fragment>
      ))}
    </motion.div>
  );
};

export default NodeContextMenu;
