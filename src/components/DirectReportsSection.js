import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Download } from 'react-feather';
import { getLanguage, getFontClass, getTextAlignClass, getTextDirection } from '../Utilities/languageUtils';

const REPORTS_DISPLAY_THRESHOLD = 3;
const MAX_NAME_LENGTH = 20;
const MAX_ROLE_LENGTH = 30;

const truncate = (str, maxLength) => {
  if (!str) return 'N/A';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

const DirectReportsSection = ({ node }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getIndirectReports = useCallback((currentNode) => {
    let indirectReports = [];
    if (currentNode && currentNode.children) {
      currentNode.children.forEach(child => {
        if (child && child.children) {
          indirectReports = [...indirectReports, ...child.children, ...getIndirectReports(child)];
        }
      });
    }
    return indirectReports;
  }, []);

  const directReports = useMemo(() => (node && node.children) || [], [node]);
  const indirectReports = useMemo(() => getIndirectReports(node), [node, getIndirectReports]);
  const totalReports = directReports.length + indirectReports.length;

  const toggleDetails = (e) => {
    e.stopPropagation();
    setIsDetailsOpen(!isDetailsOpen);
  };

  const handleDownload = (reports, filename) => {
    const data = JSON.stringify(reports, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderReportsList = (reports, threshold, type) => {
    const displayReports = reports.slice(0, threshold);
    return (
      <div>
        {reports.length > threshold && (
          <p className="text-sm text-gray-600 mb-2 text-center">
            Showing {threshold} out of {reports.length} {type} reports:
          </p>
        )}
        <ul className="text-sm text-gray-700 list-none pl-0 mb-4">
          {displayReports.map((report, index) => {
            const reportLanguage = getLanguage(report.name || '');
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`${getTextAlignClass(reportLanguage)} ${getFontClass(reportLanguage)} mb-2`}
                dir={getTextDirection(reportLanguage)}
              >
                <span title={report.name || 'N/A'}>{truncate(report.name, MAX_NAME_LENGTH)}</span>
                {' - '}
                <span title={report.role || 'N/A'}>{truncate(report.role, MAX_ROLE_LENGTH)}</span>
              </motion.li>
            );
          })}
        </ul>
        {reports.length > threshold && (
          <motion.button
            onClick={() => handleDownload(reports, `${node.name || 'reports'}_${type}_reports.json`)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            <span>Download full list ({reports.length} {type} reports)</span>
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <>
      <motion.button
        onClick={toggleDetails}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
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
              <h4 className="text-sm font-semibold text-gray-800 text-center">
                Direct Reports ({directReports.length})
              </h4>
              {directReports.length > 0 ? (
                renderReportsList(directReports, REPORTS_DISPLAY_THRESHOLD, 'direct')
              ) : (
                <p className="text-center">No direct reports</p>
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 text-center">
                Indirect Reports ({indirectReports.length})
              </h4>
              {indirectReports.length > 0 ? (
                renderReportsList(indirectReports, REPORTS_DISPLAY_THRESHOLD, 'indirect')
              ) : (
                <p className="text-center">No indirect reports</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DirectReportsSection;