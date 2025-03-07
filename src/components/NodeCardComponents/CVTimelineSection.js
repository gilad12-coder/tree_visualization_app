import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, GitBranch, Clock, ChevronDown } from 'lucide-react';
import { getLanguage, getFontClass, getTextAlignClass, getTextDirection } from '../../Utilities/languageUtils';
import axios from 'axios';
import '../../styles/scrollbar.css';
import '../../styles/fonts.css';

const API_BASE_URL = "http://localhost:5001";
const MAX_HEIGHT = 160; // Maximum height in pixels

// Default theme to match other components
const DEFAULT_THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const CVTimelineSection = ({ node, folderId, tableId, onBack, theme = DEFAULT_THEME }) => {
  const [activeScreen, setActiveScreen] = useState('main');
  const [showRoleHistory, setShowRoleHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [cv, setCV] = useState([]);
  const [error, setError] = useState(null);
  const [dataStatus, setDataStatus] = useState('idle');
  const [roleHistoryHeight, setRoleHistoryHeight] = useState('auto');
  const [timelineHeight, setTimelineHeight] = useState('auto');

  const roleHistoryRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (roleHistoryRef.current && showRoleHistory) {
      const contentHeight = roleHistoryRef.current.scrollHeight;
      setRoleHistoryHeight(contentHeight > MAX_HEIGHT ? `${MAX_HEIGHT}px` : 'auto');
    }
  }, [cv, showRoleHistory]);

  useEffect(() => {
    if (timelineRef.current && showTimeline) {
      const contentHeight = timelineRef.current.scrollHeight;
      setTimelineHeight(contentHeight > MAX_HEIGHT ? `${MAX_HEIGHT}px` : 'auto');
    }
  }, [timeline, showTimeline]);

  const fetchTimelineAndCV = async (queryType) => {
    setDataStatus('loading');
    setError(null);

    let queryParam = queryType === 'person_id' 
      ? `person_id=${encodeURIComponent(node.person_id)}`
      : `hierarchical_structure=${encodeURIComponent(node.hierarchical_structure)}`;

    try {
      const response = await axios.get(`${API_BASE_URL}/timeline/${folderId}?${queryParam}&table_id=${tableId}`);
      setTimeline(response.data.timeline);
      setCV(response.data.cv);

      if (response.data.cv.length === 0 && response.data.timeline.length === 0) {
        setDataStatus('no_data');
      } else {
        setDataStatus('success');
        setShowRoleHistory(true);
        setShowTimeline(true);
      }
      setActiveScreen('data');
    } catch (err) {
      setError('An error occurred while fetching the data. Please try again later.');
      console.error("Error fetching timeline and CV data:", err);
      setDataStatus('error');
      setActiveScreen('data');
    }
  };

  // Screen variants
  const screenVariants = {
    hidden: (direction) => ({
      x: direction * 20,
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: direction * -20,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 }
      }
    })
  };

  const renderNavigationButton = () => (
    <motion.button
      onClick={
        activeScreen === 'main' 
          ? onBack 
          : () => {
            setActiveScreen('main');
            setDataStatus('idle');
            setShowRoleHistory(false);
            setShowTimeline(false);
          }
      }
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
    >
      <ArrowLeft size={18} className="mr-2" />
      <span>{activeScreen === 'main' ? "Back to Main Info" : "Back to Query Selection"}</span>
    </motion.button>
  );

  const renderQueryTypeSelection = () => (
    <div className="space-y-3 pt-2">
      <motion.button
        onClick={() => fetchTimelineAndCV('person_id')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
      >
        <span>Query Personal Information</span>
        <User size={18} />
      </motion.button>
      <motion.button
        onClick={() => fetchTimelineAndCV('hierarchical')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
      >
        <span>Query Hierarchical Information</span>
        <GitBranch size={18} />
      </motion.button>
    </div>
  );

  const renderContent = () => {
    if (dataStatus === 'loading') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-6 px-4 bg-gray-50 rounded-md"
        >
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Loading CV data...</p>
        </motion.div>
      );
    }

    if (dataStatus === 'error') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-md bg-gray-50 border-l-4 border-gray-300 text-gray-700"
        >
          <p className="font-medium mb-1">Error</p>
          <p className="text-sm">{error}</p>
        </motion.div>
      );
    }

    if (dataStatus === 'no_data') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-md bg-gray-50 border-l-4 border-gray-300 text-gray-700"
        >
          <p className="font-medium mb-1">No Historical Data</p>
          <p className="text-sm">There is no historical data available for this query.</p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-4">
        {cv && cv.length > 0 && (
          <div>
            <motion.button
              onClick={() => setShowRoleHistory(!showRoleHistory)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <span className="flex items-center">
                <User size={18} className="mr-2" />
                Role History
              </span>
              <ChevronDown
                size={18}
                className={`transform transition-transform ${showRoleHistory ? 'rotate-180' : ''}`}
              />
            </motion.button>
            
            <AnimatePresence>
              {showRoleHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div 
                    ref={roleHistoryRef}
                    style={{ height: roleHistoryHeight, maxHeight: `${MAX_HEIGHT}px` }}
                    className="overflow-y-auto custom-scrollbar rounded-md bg-gray-50 p-3"
                  >
                    <ul className="text-sm text-gray-700 list-none pl-0 space-y-3">
                      {cv.map((record, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white p-3 rounded-md border border-gray-100"
                        >
                          {record.roles.map((role, roleIndex) => {
                            const roleLanguage = getLanguage(role.role);
                            return (
                              <div
                                key={roleIndex}
                                className={`${getTextAlignClass(roleLanguage)} ${getFontClass(roleLanguage)}`}
                                dir={getTextDirection(roleLanguage)}
                              >
                                <span className="font-medium text-gray-800">{role.role}</span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(role.startDate).toLocaleDateString()} - 
                                  {role.endDate ? new Date(role.endDate).toLocaleDateString() : 'Present'}
                                </div>
                              </div>
                            );
                          })}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {timeline && timeline.length > 0 && (
          <div>
            <motion.button
              onClick={() => setShowTimeline(!showTimeline)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <span className="flex items-center">
                <Clock size={18} className="mr-2" />
                Organization Timeline
              </span>
              <ChevronDown
                size={18}
                className={`transform transition-transform ${showTimeline ? 'rotate-180' : ''}`}
              />
            </motion.button>
            
            <AnimatePresence>
              {showTimeline && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div 
                    ref={timelineRef}
                    style={{ height: timelineHeight, maxHeight: `${MAX_HEIGHT}px` }}
                    className="relative pl-4 overflow-y-auto custom-scrollbar rounded-md bg-gray-50 p-3"
                  >
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    {timeline.map((entry, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="mb-4 relative"
                      >
                        <div className="absolute -left-[13px] top-0 w-4 h-4 bg-white rounded-full border-2 border-gray-300" />
                        <div className="bg-white p-2 rounded-md border border-gray-100 ml-2">
                          <p className="text-sm font-medium text-gray-800">
                            {new Date(entry.upload_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-600">{entry.name}</p>
                          {entry.nodes_info && entry.nodes_info.map((node, nodeIndex) => (
                            <p key={nodeIndex} className="text-xs text-gray-500 mt-1">
                              {node.name}: {node.role} ({node.department})
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        {renderNavigationButton()}
      </div>

      <AnimatePresence mode="wait">
        {activeScreen === 'main' && (
          <motion.div
            key="main"
            custom={1}
            variants={screenVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {renderQueryTypeSelection()}
          </motion.div>
        )}
        {activeScreen === 'data' && (
          <motion.div
            key="data"
            custom={-1}
            variants={screenVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CVTimelineSection;