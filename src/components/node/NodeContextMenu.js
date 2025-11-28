import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, GitBranch } from 'react-feather';
import { useTranslation } from 'react-i18next';

const NodeContextMenu = ({
  isOpen,
  position,
  onClose,
  onAddChild,
  onAddSibling,
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
      hoverBg: 'hover:bg-gray-50'
    },
    {
      icon: GitBranch,
      label: t('contextMenu.addSibling', 'Add Sibling Node'),
      action: onAddSibling,
      hoverBg: 'hover:bg-gray-50'
    }
  ];

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

  return (
    <AnimatePresence>
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
    </AnimatePresence>
  );
};

export default NodeContextMenu;
