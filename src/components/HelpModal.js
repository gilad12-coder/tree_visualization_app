import React from 'react';
import { X } from 'react-feather';
import { motion } from 'framer-motion';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-xl font-semibold mb-2">Keyboard Shortcuts</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Ctrl + H:</strong> Open this help modal</li>
              <li><strong>Ctrl + T:</strong> Change table</li>
              <li><strong>Ctrl + F:</strong> Filter nodes</li>
              <li><strong>Ctrl + C:</strong> Center the chart</li>
              <li><strong>Ctrl + O:</strong> Open all nodes</li>
              <li><strong>Ctrl + L:</strong> Collapse all nodes</li>
              <li><strong>Ctrl + U:</strong> Upload new table</li>
              <li><strong>Ctrl + M:</strong> Compare tables</li>
              <li><strong>Arrow keys:</strong> Navigate the chart</li>
              <li><strong>+ / -:</strong> Zoom in / out</li>
            </ul>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpModal;