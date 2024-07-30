import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Download, Clock } from 'react-feather';
import { getLanguage, getFontClass, getTextAlignClass, getTextDirection } from '../Utilities/languageUtils';

const TIMELINE_AND_CV_DISPLAY_THRESHOLD = 10;

const CVTimelineSection = ({ node, folderId, tableId, onBack }) => {
  const [showTimeline, setShowTimeline] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [cv, setCV] = useState([]);
  const [error, setError] = useState(null);
  const [dataStatus, setDataStatus] = useState('idle');

  useEffect(() => {
    const fetchTimelineAndCV = async () => {
      if (!folderId || !tableId) return;
      
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
  }, [folderId, node.name, tableId]);

  const handleDownload = useCallback((data, filename) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleTimelineDownload = useCallback(() => {
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
  }, [timeline, node.name]);

  return (
    <div className="p-6 space-y-6">
      <motion.button
        onClick={onBack}
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
                {cv.slice(0, TIMELINE_AND_CV_DISPLAY_THRESHOLD).map((record, index) => {
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
              {cv.length > TIMELINE_AND_CV_DISPLAY_THRESHOLD && (
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
                      {timeline.slice(0, TIMELINE_AND_CV_DISPLAY_THRESHOLD).map((entry, index) => (
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
                    {timeline.length > TIMELINE_AND_CV_DISPLAY_THRESHOLD && (
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
};

export default CVTimelineSection;