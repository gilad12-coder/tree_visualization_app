import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, Target, Filter, Users, Layers, ChevronDown, ChevronUp, 
  Upload, GitBranch, Settings, Command, Search, X
} from 'react-feather';

const NavigationBar = ({
  onHome,
  onCenter,
  onFilter,
  onOrgMode,
  onChangeTable,
  onExpandAll,
  onCollapseAll,
  onUpload,
  onCompare,
  onOpenSettings,
  onOpenHelp,
  onSearch,
  onClearFilter,
  isOrgMode,
  hasActiveFilters,
  activeMenuId,
  setActiveMenuId
}) => {
  const menus = [
    {
      id: 'view',
      label: 'View',
      icon: <ChevronDown size={16} />,
      items: [
        { id: 'expandAll', label: 'Expand All', icon: <ChevronDown size={16} />, onClick: onExpandAll },
        { id: 'collapseAll', label: 'Collapse All', icon: <ChevronUp size={16} />, onClick: onCollapseAll }
      ]
    },
    {
      id: 'data',
      label: 'Data',
      icon: <Upload size={16} />,
      items: [
        { id: 'upload', label: 'Upload New Table', icon: <Upload size={16} />, onClick: onUpload },
        { id: 'compare', label: 'Compare Tables', icon: <GitBranch size={16} />, onClick: onCompare }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: <Settings size={16} />,
      items: [
        { id: 'settings', label: 'Settings', icon: <Settings size={16} />, onClick: onOpenSettings },
        { id: 'shortcuts', label: 'Shortcuts', icon: <Command size={16} />, onClick: onOpenHelp }
      ]
    }
  ];

  const toggleMenu = (menuId) => {
    setActiveMenuId(activeMenuId === menuId ? null : menuId);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-gray-100 bg-opacity-90 backdrop-filter backdrop-blur-sm shadow-sm px-4 py-2 flex">
        <div className="flex space-x-2">
          <NavButton onClick={onHome} icon={<Home size={18} />} label="Home" />
          <NavButton onClick={onCenter} icon={<Target size={18} />} label="Center" />
          <NavButton onClick={onFilter} icon={<Filter size={18} />} label="Filter" active={hasActiveFilters} />
          {hasActiveFilters && (
            <NavButton onClick={onClearFilter} icon={<X size={18} />} label="Clear" variant="danger" />
          )}
        </div>

        <div className="flex space-x-2 mx-4">
          <NavButton onClick={onOrgMode} icon={<Users size={18} />} label="Org Mode" active={isOrgMode} />
          <NavButton onClick={onChangeTable} icon={<Layers size={18} />} label="Change Table" />
        </div>

        <div className="flex space-x-1">
          {menus.map((menu) => (
            <div key={menu.id} className="relative">
              <NavButton
                onClick={() => toggleMenu(menu.id)}
                icon={menu.icon}
                label={menu.label}
                active={activeMenuId === menu.id}
                hasDropdown
              />
              <AnimatePresence>
                {activeMenuId === menu.id && (
                  <DropdownMenu items={menu.items} onClose={() => setActiveMenuId(null)} />
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="ml-auto">
          <NavButton onClick={onSearch} icon={<Search size={18} />} label="Search" />
        </div>
      </div>
    </div>
  );
};

const NavButton = ({ onClick, icon, label, variant = 'default', active = false, hasDropdown = false }) => {
  const getVariantClasses = () => {
    if (active) return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    return variant === 'danger' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-white hover:bg-gray-100 text-gray-700';
  };

  return (
    <motion.button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center ${getVariantClasses()}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="mr-1.5">{icon}</span>
      <span>{label}</span>
      {hasDropdown && <ChevronDown size={14} className="ml-1" />}
    </motion.button>
  );
};

const DropdownMenu = ({ items, onClose }) => (
  <motion.div
    className="absolute top-full mt-1 right-0 bg-white rounded-md shadow-lg py-1 min-w-[180px] z-50"
    initial={{ opacity: 0, y: -5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -5 }}
    transition={{ duration: 0.15 }}
  >
    <div className="py-1">
      {items.map((item) => (
        <motion.button
          key={item.id}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
          onClick={() => {
            item.onClick();
            onClose();
          }}
          whileHover={{ x: 5 }}
        >
          <span className="mr-2">{item.icon}</span>
          {item.label}
        </motion.button>
      ))}
    </div>
  </motion.div>
);

export default NavigationBar;