import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Upload, GitBranch, Settings, Command } from 'react-feather';
import Button from './Button';

const ToolbarMenu = ({
  isOpen,
  onClose,
  onExpandAll,
  onCollapseAll,
  onUpload,
  onCompare,
  onOpenSettings,
  onOpenHelp
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-12 right-0 bg-white shadow-lg rounded-md p-2 z-20"
      >
        <div className="flex flex-col space-y-2">
          <Button onClick={onExpandAll} icon={ChevronDown} tooltip="Open All (Ctrl+O)">
            Open All
          </Button>
          <Button onClick={onCollapseAll} icon={ChevronUp} tooltip="Collapse All (Ctrl+L)">
            Collapse All
          </Button>
          <Button onClick={onUpload} icon={Upload} tooltip="Upload New Table (Ctrl+U)">
            Upload New Table
          </Button>
          <Button onClick={onCompare} icon={GitBranch} tooltip="Compare Tables (Ctrl+M)">
            Compare Tables
          </Button>
          <Button onClick={onOpenSettings} icon={Settings} tooltip="Settings">
            Settings
          </Button>
          <Button onClick={onOpenHelp} icon={Command} tooltip="View Shortcuts (Ctrl+H)">
            Shortcuts
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ToolbarMenu;