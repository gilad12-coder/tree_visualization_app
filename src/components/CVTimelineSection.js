import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, GitBranch, Clock, ChevronDown } from 'lucide-react';
import { getLanguage, getFontClass, getTextAlignClass, getTextDirection } from '../Utilities/languageUtils';
import axios from 'axios';
import '../styles/scrollbar.css';
import '../styles/fonts.css';

const API_BASE_URL = "http://localhost:5000";
const MAX_HEIGHT = 160; // Maximum height in pixels

const CVTimelineSection = ({ node, folderId, tableId, onBack }) => {
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

    if (queryType === 'person_id' && (isNaN(node.person_id) || node.person_id === 'nan')) {
      setError('Unable to fetch timeline. This node is currently unmanned.');
      setDataStatus('error');
      setActiveScreen('data');
      return;
    }

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

  const renderNavigationButton = (onClick, icon, text) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center"
    >
      {icon}
      <span className="font-bold">{text}</span>
    </motion.button>
  );

  const renderQueryTypeSelection = () => (
    <div className="space-y-4">
      <motion.button
        onClick={() => fetchTimelineAndCV('person_id')}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-bold">Query Personal Information</span>
        <User size={20} />
      </motion.button>
      <motion.button
        onClick={() => fetchTimelineAndCV('hierarchical')}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-bold">Query Hierarchical Information</span>
        <GitBranch size={20} />
      </motion.button>
    </div>
  );

  const renderContent = () => {
    if (dataStatus === 'loading') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <p className="text-lg font-semibold text-gray-800">Loading CV data...</p>
          <p className="text-sm text-gray-600 mt-2">This may take a few moments.</p>
        </motion.div>
      );
    }

    if (dataStatus === 'error') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded"
        >
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </motion.div>
      );
    }

    if (dataStatus === 'no_data') {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded"
        >
          <p className="font-bold">No Historical Data</p>
          <p>There is no historical data available for this query.</p>
        </motion.div>
      );
    }

    return (
      <div className="space-y-4">
        {cv && cv.length > 0 && (
          <div>
            <motion.button
              onClick={() => setShowRoleHistory(!showRoleHistory)}
              className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-bold flex items-center">
                <User size={20} className="mr-2" />
                Role History
              </span>
              <ChevronDown
                size={20}
                className={`transform transition-transform ${showRoleHistory ? 'rotate-180' : ''}`}
              />
            </motion.button>
            
            <AnimatePresence>
              {showRoleHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-4"
                >
                  <div 
                    ref={roleHistoryRef}
                    style={{ height: roleHistoryHeight, maxHeight: `${MAX_HEIGHT}px` }}
                    className="overflow-y-auto custom-scrollbar"
                  >
                    <ul className="text-sm text-gray-700 list-none pl-0">
                      {cv.map((record, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="mb-2 pb-2 border-b border-gray-200 last:border-b-0"
                        >
                          {record.roles.map((role, roleIndex) => {
                            const roleLanguage = getLanguage(role.role);
                            return (
                              <div
                                key={roleIndex}
                                className={`${getTextAlignClass(roleLanguage)} ${getFontClass(roleLanguage)}`}
                                dir={getTextDirection(roleLanguage)}
                              >
                                <span className="font-semibold">{role.role}</span>
                                <br />
                                <span className="text-xs text-gray-600">
                                  {new Date(role.startDate).toLocaleDateString()} - 
                                  {role.endDate ? new Date(role.endDate).toLocaleDateString() : 'Present'}
                                </span>
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
                  <div 
                    ref={timelineRef}
                    style={{ height: timelineHeight, maxHeight: `${MAX_HEIGHT}px` }}
                    className="relative pl-4 border-l-2 border-blue-200 overflow-y-auto custom-scrollbar"
                  >
                    {timeline.map((entry, index) => (
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
                        {entry.nodes_info && entry.nodes_info.map((node, nodeIndex) => (
                          <p key={nodeIndex} className="text-xs text-gray-600">
                            {node.name}: {node.role} ({node.department})
                          </p>
                        ))}
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
    <div className="p-6 space-y-6">
      {renderNavigationButton(
        activeScreen === 'main' ? onBack : () => {
          setActiveScreen('main');
          setDataStatus('idle');
          setShowRoleHistory(false);
          setShowTimeline(false);
        },
        <ArrowLeft size={20} className="mr-2" />,
        activeScreen === 'main' ? "Back to Main Info" : "Back to Query Selection"
      )}

      <AnimatePresence mode="wait">
        {activeScreen === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
          >
            {renderQueryTypeSelection()}
          </motion.div>
        )}
        {activeScreen === 'data' && (
          <motion.div
            key="data"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CVTimelineSection;