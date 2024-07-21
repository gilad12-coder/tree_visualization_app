import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, User, Mail, Users, ChevronDown, Download } from 'react-feather';
import { getLanguage, getFontClass, getTextAlignClass, getTextDirection } from '../Utilities/languageUtils';
import '../styles/fonts.css';

const MotionPath = motion.path;

const AnimatedLogo = () => (
  <svg width="40" height="40" viewBox="0 0 50 50">
    <MotionPath
      d="M25,10 L40,40 L10,40 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, ease: "easeInOut" }}
    />
  </svg>
);

const INDIRECT_REPORTS_DISPLAY_THRESHOLD = 10;

const EnhancedNodeCard = ({ node, onClose }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const bgOpacity = useMotionValue(0);
  const bgBlur = useTransform(bgOpacity, [0, 1], [0, 10]);

  const nameLanguage = getLanguage(node.name);
  const roleLanguage = getLanguage(node.role);

  useEffect(() => {
    console.log('Node data:', node);
  }, [node]);

  const toggleDetails = (e) => {
    e.stopPropagation();
    setIsDetailsOpen(!isDetailsOpen);
  };

  const getIndirectReports = useCallback((currentNode) => {
    let indirectReports = [];
    if (currentNode.children) {
      currentNode.children.forEach(child => {
        if (child.children) {
          indirectReports = [...indirectReports, ...child.children, ...getIndirectReports(child)];
        }
      });
    }
    return indirectReports;
  }, []);

  const directReports = useMemo(() => node.children || [], [node]);
  const indirectReports = useMemo(() => getIndirectReports(node), [node, getIndirectReports]);
  const totalReports = directReports.length + indirectReports.length;

  const handleDownload = () => {
    const data = JSON.stringify(indirectReports, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${node.name}_indirect_reports.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderIndirectReports = () => {
    if (indirectReports.length <= INDIRECT_REPORTS_DISPLAY_THRESHOLD) {
      return (
        <ul className="text-sm text-black list-disc list-inside">
          {indirectReports.map((report, index) => {
            const reportLanguage = getLanguage(report.name);
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + directReports.length) * 0.1 }}
                className={`${getTextAlignClass(reportLanguage)} ${getFontClass(reportLanguage)}`}
                dir={getTextDirection(reportLanguage)}
              >
                {report.name} - {report.role}
              </motion.li>
            );
          })}
        </ul>
      );
    } else {
      return (
        <div>
          <p className="text-sm text-black mb-2">
            Showing top {INDIRECT_REPORTS_DISPLAY_THRESHOLD} of {indirectReports.length} indirect reports:
          </p>
          <ul className="text-sm text-black list-disc list-inside mb-4">
            {indirectReports.slice(0, INDIRECT_REPORTS_DISPLAY_THRESHOLD).map((report, index) => {
              const reportLanguage = getLanguage(report.name);
              return (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${getTextAlignClass(reportLanguage)} ${getFontClass(reportLanguage)}`}
                  dir={getTextDirection(reportLanguage)}
                >
                  {report.name} - {report.role}
                </motion.li>
              );
            })}
          </ul>
          <motion.button
            onClick={handleDownload}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            <span>Download full list</span>
          </motion.button>
        </div>
      );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex justify-center items-center z-50 p-8"
        onClick={onClose}
        style={{
          backgroundColor: `rgba(0, 0, 0, ${bgOpacity.get()})`,
          backdropFilter: `blur(${bgBlur.get()}px)`,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-white bg-opacity-90 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden backdrop-filter backdrop-blur-lg"
          onClick={(e) => e.stopPropagation()}
          onAnimationComplete={() => bgOpacity.set(0.5)}
        >
          <div className="p-8 bg-blue-500 bg-opacity-20 backdrop-filter backdrop-blur-sm relative">
            <div className="flex items-center justify-between">
              <div className="absolute left-8">
                <AnimatedLogo />
              </div>
              <h2
                className={`text-3xl font-black text-black tracking-tight ${getFontClass(nameLanguage)} text-right w-full pr-12`}
                dir={getTextDirection(nameLanguage)}
              >
                {node.name}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute right-8 text-black hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </motion.button>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <motion.div
              className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4 flex items-center justify-center"
              whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
            >
              <span
                className={`text-black ${getFontClass(roleLanguage)} text-center`}
                dir={getTextDirection(roleLanguage)}
              >
                {node.role}
              </span>
            </motion.div>
            {node.department && (
              <motion.div
                className={`bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4 flex items-center space-x-3 ${getLanguage(node.department) !== 'default' ? 'flex-row-reverse' : 'flex-row'}`}
                whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
              >
                <User size={20} className="text-black" />
                <span
                  className={`text-black ${getFontClass(getLanguage(node.department))} ${getTextAlignClass(getLanguage(node.department))}`}
                  dir={getTextDirection(getLanguage(node.department))}
                >
                  {node.department}
                </span>
              </motion.div>
            )}
            {node.email && (
              <motion.div
                className="bg-blue-500 bg-opacity-20 rounded-xl py-3 px-4 flex items-center space-x-3"
                whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
              >
                <Mail size={20} className="text-black" />
                <span className="text-black">{node.email}</span>
              </motion.div>
            )}
            <motion.button
              onClick={toggleDetails}
              className="w-full px-4 py-3 bg-blue-500 bg-opacity-20 text-black rounded-xl hover:bg-blue-600 hover:bg-opacity-30 transition-colors flex items-center justify-between"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-bold">View Reports ({totalReports})</span>
              <motion.div
                animate={{ rotate: isDetailsOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={20} />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {isDetailsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-black flex items-center">
                      <Users size={16} className="mr-2" />
                      Direct Reports: ({directReports.length})
                    </h4>
                    <ul className="text-sm text-black list-disc list-inside">
                      {directReports.length > 0 ? (
                        directReports.map((child, index) => {
                          const childLanguage = getLanguage(child.name);
                          return (
                            <motion.li
                              key={index}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className={`${getTextAlignClass(childLanguage)} ${getFontClass(childLanguage)}`}
                              dir={getTextDirection(childLanguage)}
                            >
                              {child.name} - {child.role}
                            </motion.li>
                          );
                        })
                      ) : (
                        <li>No direct reports</li>
                      )}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-black flex items-center">
                      <Users size={16} className="mr-2" />
                      Indirect Reports: ({indirectReports.length})
                    </h4>
                    {renderIndirectReports()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedNodeCard;