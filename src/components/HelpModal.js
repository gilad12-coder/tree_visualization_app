import React from "react";
import { X } from "react-feather";
import { motion } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Ctrl + H", description: "Open this help modal" },
    { key: "Ctrl + T", description: "Change table" },
    { key: "Ctrl + F", description: "Filter nodes" },
    { key: "Ctrl + R", description: "Remove filter (available when a a filter is triggered)" },
    { key: "Ctrl + C", description: "Center the chart" },
    { key: "Ctrl + O", description: "Open all nodes" },
    { key: "Ctrl + L", description: "Collapse all nodes" },
    { key: "Ctrl + U", description: "Upload new table" },
    { key: "Ctrl + M", description: "Compare tables" },
    { key: "Arrow keys", description: "Navigate the chart" },
    { key: "+ / -", description: "Zoom in / out" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center"
    >
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-semibold mb-4 text-center">
              Keyboard Shortcuts
            </h3>
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="text-center">
                  <span className="font-bold">{shortcut.key}</span>
                  <span className="mx-2">-</span>
                  <span>{shortcut.description}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpModal;
