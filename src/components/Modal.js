import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, User, Mail, X } from 'react-feather';
import Button from './Button';
import getAllReports from '../utils/getAllReports';

const Modal = ({ node, onClose }) => {
  const allReports = getAllReports(node);
  const indirectReports = allReports.filter(report => !node.children.includes(report));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800">{node.name}</h2>
            <Button onClick={onClose} icon={X} variant="secondary" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <Briefcase size={24} className="text-blue-500 mr-3" />
              <p className="text-xl sm:text-2xl text-gray-700">{node.role}</p>
            </div>
            {node.department && (
              <div className="flex items-center">
                <User size={24} className="text-green-500 mr-3" />
                <p className="text-lg sm:text-xl text-gray-600">{node.department}</p>
              </div>
            )}
            {node.email && (
              <div className="flex items-center">
                <Mail size={24} className="text-purple-500 mr-3" />
                <p className="text-lg sm:text-xl text-gray-600">{node.email}</p>
              </div>
            )}
          </div>
          {node.children && node.children.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4 text-gray-700">Direct Reports ({node.children.length}):</h3>
              <ul className="list-disc pl-8 space-y-2">
                {node.children.map((child, index) => (
                  <li key={index} className="text-lg text-gray-600">{child.name} - {child.role}</li>
                ))}
              </ul>
            </div>
          )}
          {indirectReports.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-semibold mb-4 text-gray-700">Indirect Reports ({indirectReports.length}):</h3>
              <ul className="list-disc pl-8 space-y-2">
                {indirectReports.map((report, index) => (
                  <li key={index} className="text-lg text-gray-600">{report.name} - {report.role}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Modal;
