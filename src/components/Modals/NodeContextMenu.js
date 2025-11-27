import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Edit, Trash2, GitBranch } from 'react-feather';
import { useTranslation } from 'react-i18next';

const NodeContextMenu = ({
  isOpen,
  position,
  onClose,
  onAddChild,
  onAddSibling,
  onEdit,
  onDelete,
  node,
  canDelete = true
}) => {
  const { t } = useTranslation();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  if (!isOpen || !position) return null;

  const menuItems = [
    {
      icon: UserPlus,
      label: t('contextMenu.addChild', 'Add Child Node'),
      action: onAddChild,
      color: 'text-blue-600',
      hoverBg: 'hover:bg-blue-50'
    },
    {
      icon: GitBranch,
      label: t('contextMenu.addSibling', 'Add Sibling Node'),
      action: onAddSibling,
      color: 'text-green-600',
      hoverBg: 'hover:bg-green-50'
    },
    {
      icon: Edit,
      label: t('contextMenu.edit', 'Edit Node'),
      action: onEdit,
      color: 'text-yellow-600',
      hoverBg: 'hover:bg-yellow-50'
    }
  ];

  if (canDelete) {
    menuItems.push({
      icon: Trash2,
      label: t('contextMenu.delete', 'Delete Node'),
      action: onDelete,
      color: 'text-red-600',
      hoverBg: 'hover:bg-red-50',
      divider: true
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        {menuItems.map((item, index) => (
          <React.Fragment key={index}>
            {item.divider && <div className="my-1 border-t border-gray-200" />}
            <button
              onClick={() => {
                item.action();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${item.hoverBg}`}
            >
              <item.icon size={18} className={item.color} />
              <span className="text-sm font-medium text-gray-700">
                {item.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};

export default NodeContextMenu;
