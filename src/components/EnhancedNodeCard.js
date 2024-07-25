import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, ChevronDown, Download, Clock } from 'react-feather';
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

const EnhancedNodeCard = ({ node, onClose, tableId, folderId }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeScreen, setActiveScreen] = useState('main');
  const [timeline, setTimeline] = useState([]);
  const [cv, setCV] = useState([]);
  const [error, setError] = useState(null);
  const [dataStatus, setDataStatus] = useState('idle');
  const bgOpacity = useMotionValue(0);
  const bgBlur = useTransform(bgOpacity, [0, 1], [0, 10]);

  const nameLanguage = getLanguage(node.name);
  const roleLanguage = getLanguage(node.role);

  useEffect(() => {
    const fetchTimelineAndCV = async () => {
      if (activeScreen !== 'cv' || !folderId || !tableId) return;
      
      setDataStatus('loading');
      setError(null);

      try {
        const response = await fetch(`http://localhost:5000/timeline/${folderId}?name=${encodeURIComponent(node.name)}&table_id=${tableId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch timeline and CV data');
        }
        const data = await response.json();
        setTimeline(data.timeline);
        setCV(data.cv);

        if (data.cv.length === 0 && data.timeline.length === 0) {
          setDataStatus('no_data');
        } else {
          setDataStatus('success');
        }
      } catch (err) {
        setError('An error occurred while fetching the data. Please try again later.');
        console.error('Error fetching timeline and CV data:', err);
        setDataStatus('error');
      }
    };

    fetchTimelineAndCV();
  }, [folderId, node.name, activeScreen, tableId]);

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

  const handleTimelineDownload = () => {
    const timelineData = timeline.map(entry => ({
      date: entry.upload_date,
      name: entry.name,
      role: entry.person_info ? entry.person_info.role : 'N/A'
    }));
    
    const csvContent = [
      ['Date', 'Snapshot Name', 'Role'],
      ...timelineData.map(item => [item.date, item.name, item.role])
    ].map(e => e.join(',')).join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${node.name}_timeline.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderIndirectReports = () => {
    if (indirectReports.length <= INDIRECT_REPORTS_DISPLAY_THRESHOLD) {
      return (
        <ul className="text-sm text-gray-700 list-none pl-0">
          {indirectReports.map((report, index) => {
            const reportLanguage = getLanguage(report.name);
            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (index + directReports.length) * 0.1 }}
                className={`${getTextAlignClass(reportLanguage)} ${getFontClass(reportLanguage)} mb-2`}
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
          <p className="text-sm text-gray-700 mb-2 text-center">
            Showing top {INDIRECT_REPORTS_DISPLAY_THRESHOLD} of {indirectReports.length} indirect reports:
          </p>
          <ul className="text-sm text-gray-700 list-none pl-0 mb-4">
            {indirectReports.slice(0, INDIRECT_REPORTS_DISPLAY_THRESHOLD).map((report, index) => {
              const reportLanguage = getLanguage(report.name);
              return (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${getTextAlignClass(reportLanguage)} ${getFontClass(reportLanguage)} mb-2`}
                  dir={getTextDirection(reportLanguage)}
                >
                  {report.name} - {report.role}
                </motion.li>
              );
            })}
          </ul>
          <motion.button
            onClick={handleDownload}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors mx-auto"
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

  const renderMainScreen = () => (
    <div className="p-6 space-y-4">
      <motion.div
        className="bg-blue-100 rounded-xl py-3 px-4 flex items-center justify-center"
        whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
      >
        <span
          className={`text-gray-800 ${getFontClass(roleLanguage)} text-center font-semibold`}
          dir={getTextDirection(roleLanguage)}
        >
          {node.role}
        </span>
      </motion.div>
      {node.department && (
        <motion.div
          className="bg-blue-100 rounded-xl py-3 px-4 flex items-center justify-center"
          whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
        >
          <span
            className={`text-gray-800 ${getFontClass(getLanguage(node.department))} text-center`}
            dir={getTextDirection(getLanguage(node.department))}
          >
            {node.department}
          </span>
        </motion.div>
      )}
      {node.email && (
        <motion.div
          className="bg-blue-100 rounded-xl py-3 px-4 flex items-center justify-center"
          whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
        >
          <span className="text-gray-800 text-center">{node.email}</span>
        </motion.div>
      )}
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
              <ul className="text-sm text-gray-700 list-none pl-0">
                {directReports.length > 0 ? (
                  directReports.map((child, index) => {
                    const childLanguage = getLanguage(child.name);
                    return (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`${getTextAlignClass(childLanguage)} ${getFontClass(childLanguage)} mb-2`}
                        dir={getTextDirection(childLanguage)}
                      >
                        {child.name} - {child.role}
                      </motion.li>
                    );
                  })
                ) : (
                  <li className="text-center">No direct reports</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 text-center">
                Indirect Reports ({indirectReports.length})
              </h4>
              {renderIndirectReports()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => {
          setActiveScreen('cv');
          console.log('Switching to CV screen');
        }}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-bold">View CV</span>
        <ArrowRight size={20} />
      </motion.button>
    </div>
  );

  const renderCVScreen = () => (
    <div className="p-6 space-y-6">
      <motion.button
        onClick={() => {
          setActiveScreen('main');
          console.log('Switching back to main screen');
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center"
      >
        <ArrowLeft size={20} className="mr-2" />
        <span className="font-bold">Back to Main Info</span>
      </motion.button>
  
      {dataStatus === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-lg font-semibold text-gray-800">Waiting to fetch CV data...</p>
        </motion.div>
      )}
  
      {dataStatus === 'loading' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-lg font-semibold text-gray-800">Loading CV data...</p>
          <p className="text-sm text-gray-600 mt-2">This may take a few moments.</p>
        </motion.div>
      )}
  
      {dataStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded"
        >
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </motion.div>
      )}
  
      {dataStatus === 'no_data' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded"
        >
          <p className="font-bold">No Historical Data</p>
          <p>There is no historical data available for this employee.</p>
        </motion.div>
      )}
  
      {dataStatus === 'success' && (
        <div className="space-y-8">
          {cv && cv.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Role History</h3>
              <ul className="text-sm text-gray-700 list-none pl-0">
                {cv.slice(0, 5).map((record, index) => {
                  const roleLanguage = getLanguage(record.role);
                  return (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${getTextAlignClass(roleLanguage)} ${getFontClass(roleLanguage)} mb-2 pb-2 border-b border-gray-200 last:border-b-0`}
                      dir={getTextDirection(roleLanguage)}
                    >
                      <span className="font-semibold">{record.role}</span>
                      <br />
                      <span className="text-xs text-gray-600">
                        {new Date(record.startDate).toLocaleDateString()} - 
                        {record.endDate ? new Date(record.endDate).toLocaleDateString() : 'Present'}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
              {cv.length > 5 && (
                <motion.button
                  onClick={() => handleDownload(cv, `${node.name}_cv.json`)}
                  className="mt-4 flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download size={16} />
                  <span>Download full CV</span>
                </motion.button>
              )}
            </div>
          )}
          
          {timeline && timeline.length > 0 && (
            <div>
              <motion.button
                onClick={() => setShowTimeline(!showTimeline)}
                className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="font-bold flex items-center">
                  <Clock size={20} className="mr-2" />
                  Organization Timeline
                </span>
                <ChevronDown
                  size={20}
                  className={`transform transition-transform ${showTimeline ? 'rotate-180' : ''}`}
                />
              </motion.button>
              
              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-4"
                  >
                    <div className="relative pl-4 border-l-2 border-blue-200">
                      {timeline.slice(0, 5).map((entry, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="mb-4 relative"
                        >
                          <div className="absolute -left-[21px] top-0 w-4 h-4 bg-blue-200 rounded-full border-4 border-white" />
                          <p className="text-sm font-semibold text-gray-800">
                            {new Date(entry.upload_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600">{entry.name}</p>
                          {entry.person_info && (
                            <p className="text-xs text-gray-600">
                              Role: {entry.person_info.role}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {timeline.length > 5 && (
                      <motion.button
                        onClick={handleTimelineDownload}
                        className="mt-4 flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors mx-auto"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Download size={16} />
                        <span>Download full timeline</span>
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex justify-center items-center z-50 p-4 bg-black bg-opacity-50"
        onClick={onClose}
        style={{
          backdropFilter: `blur(${bgBlur.get()}px)`,
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onAnimationComplete={() => bgOpacity.set(0.5)}
        >
          <div className="p-6 bg-blue-100 relative">
            <div className="absolute left-6 top-6">
              <AnimatedLogo />
            </div>
            <h2
              className={`text-3xl font-black text-gray-800 tracking-tight ${getFontClass(nameLanguage)} text-center mt-8`}
              dir={getTextDirection(nameLanguage)}
            >
              {node.name}
            </h2>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute right-6 top-6 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X size={24} />
            </motion.button>
          </div>
          <AnimatePresence mode="wait">
            {activeScreen === 'main' ? (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                {renderMainScreen()}
              </motion.div>
            ) : (
              <motion.div
                key="cv"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                {renderCVScreen()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedNodeCard;