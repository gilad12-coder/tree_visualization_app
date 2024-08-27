import React from "react";
import { X } from "react-feather";
import { motion } from "framer-motion";

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Ctrl + H", description: "Open this help modal" },
    { key: "Ctrl + G", description: "Change table" },
    { key: "Ctrl + S", description: "Filter nodes" },
    { key: "Ctrl + R", description: "Remove search filter" },
    { key: "Ctrl + O", description: "Toggle Org Mode (focus on department structure)" },
    { key: "Ctrl + F", description: "Toggle searchbar" },
    { key: "Ctrl + C", description: "Center the chart" },
    { key: "Ctrl + E", description: "Expand all nodes" },
    { key: "Ctrl + Q", description: "Collapse all nodes" },
    { key: "Ctrl + U", description: "Upload new table" },
    { key: "Ctrl + M", description: "Compare tables" },
    { key: "Arrow keys", description: "Navigate the chart" },
    { key: "= / -", description: "Zoom in / out" }
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
          
          <div className="text-center text-sm text-gray-600 mt-4">
            If a shortcut isn't working, try holding the Shift key while using it.
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpModal;