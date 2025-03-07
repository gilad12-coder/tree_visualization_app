import React, { useEffect } from "react";
import { X, Keyboard, Navigation, MousePointer, ExternalLink, CornerDownRight } from "lucide-react";
import { motion } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
  // Close modal on Escape key press
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (event) => {
        if (event.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcutCategories = {
    general: {
      icon: Keyboard,
      title: "General Shortcuts",
      shortcuts: [
        { key: "Ctrl + H", description: "Toggle this help modal" },
        { key: "Ctrl + G", description: "Change table" },
        { key: "Ctrl + U", description: "Upload new table" },
        { key: "Ctrl + M", description: "Compare tables" },
        { key: "Escape", description: "Cancel swapping / Close modal" },
      ],
    },
    navigation: {
      icon: Navigation,
      title: "Navigation",
      shortcuts: [
        { key: "Arrow keys", description: "Pan the chart" },
        { key: "= / -", description: "Zoom in / out" },
        { key: "Mouse wheel", description: "Zoom in / out" },
        { key: "Click & drag", description: "Pan the chart" },
        { key: "Ctrl + C", description: "Center the chart" },
      ],
    },
    nodeInteractions: {
      icon: MousePointer,
      title: "Node Interactions",
      shortcuts: [
        { key: "Left click", description: "Expand/collapse node" },
        { key: "Right click", description: "Highlight node" },
        { key: "Long press", description: "Select node for swapping" },
        { key: <ExternalLink className="inline w-4 h-4"/>, description: "Open node card modal" },
        { key: "Ctrl + S", description: "Filter nodes" },
        { key: "Ctrl + R", description: "Remove search filter" },
        { key: "Ctrl + O", description: "Toggle Org Mode" },
        { key: "Ctrl + F", description: "Toggle searchbar" },
        { key: "Ctrl + E", description: "Expand all nodes" },
        { key: "Ctrl + Q", description: "Collapse all nodes" },
      ],
    },
    swapping: {
      icon: CornerDownRight,
      title: "Node Swapping",
      shortcuts: [
        { key: "Long press", description: "Select node for swapping" },
        { key: "Click", description: "Swap with target node (same level)" },
        { key: "Escape", description: "Cancel swapping" },
        { key: "Click outside", description: "Cancel swapping" },
      ],
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex justify-end items-center p-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(shortcutCategories).map(([key, category]) => (
            <section key={key} className="pb-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-1.5 mb-1.5">
                <category.icon className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-medium text-gray-500">{category.title}</h3>
              </div>
              <div className="space-y-0.5">
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-0.5"
                  >
                    <span className="text-xs text-gray-600">{shortcut.description}</span>
                    <kbd className="ml-3 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 whitespace-nowrap flex items-center">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
          <span className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">Esc</kbd> to close
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpModal;