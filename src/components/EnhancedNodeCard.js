import React, { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, ArrowRight, User } from 'react-feather';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import DirectReportsSection from './DirectReportsSection';
import CVTimelineSection from './CVTimelineSection';
import PersonalInfoSection from './PersonalInfoSection';
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

const EnhancedNodeCard = ({ node, onClose, tableId, folderId }) => {
  const [activeScreen, setActiveScreen] = useState('main');
  const bgOpacity = useMotionValue(0);
  const bgBlur = useTransform(bgOpacity, [0, 1], [0, 10]);

  const nameLanguage = getLanguage(node.name);
  const roleLanguage = getLanguage(node.role);
  const departmentLanguage = getLanguage(node.department);

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
          {node.role || 'Role not specified'}
        </span>
      </motion.div>
      <motion.div
        className="bg-blue-100 rounded-xl py-3 px-4 flex items-center justify-center"
        whileHover={{ boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" }}
      >
        <span
          className={`text-gray-800 ${getFontClass(departmentLanguage)} text-center`}
          dir={getTextDirection(departmentLanguage)}
        >
          {node.department || 'Department not specified'}
        </span>
      </motion.div>
      <DirectReportsSection node={node} />
      <motion.button
        onClick={() => setActiveScreen('personal')}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-bold">View Personal Info</span>
        <User size={20} />
      </motion.button>
      <motion.button
        onClick={() => setActiveScreen('cv')}
        className="w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="font-bold">View CV</span>
        <ArrowRight size={20} />
      </motion.button>
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
              {node.name || 'Name not provided'}
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
            {activeScreen === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                {renderMainScreen()}
              </motion.div>
            )}
            {activeScreen === 'personal' && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <PersonalInfoSection
                  node={node}
                  onBack={() => setActiveScreen('main')}
                />
              </motion.div>
            )}
            {activeScreen === 'cv' && (
              <motion.div
                key="cv"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <CVTimelineSection
                  node={node}
                  folderId={folderId}
                  tableId={tableId}
                  onBack={() => setActiveScreen('main')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EnhancedNodeCard;