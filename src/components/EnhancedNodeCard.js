import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, User, Edit, GitBranch, ArrowLeft, FileText } from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import CVTimelineSection from './NodeCardComponents/CVTimelineSection';
import UpdatePersonalInfoSection from './NodeCardComponents/UpdatePersonalInfoSection.js';
import UpdateHierarchicalInfoSection from './NodeCardComponents/UpdateHierarchicalInfoSection.js';
import NodeInformation from './NodeCardComponents/NodeInformation.js';
import '../styles/fonts.css';
import '../styles/scrollbar.css';

const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const EnhancedNodeCard = ({ 
  node, 
  onClose, 
  tableId, 
  folderId, 
  folderStructure, 
  onUpdateComplete,
  onOpenUpdateModal,
  onCloseUpdateModal,
  getParentNode
}) => {
  const [activeScreen, setActiveScreen] = useState('main');
  const roleLanguage = getLanguage(node.role);
  const departmentLanguage = getLanguage(node.department);

  const handleOpenUpdateScreen = () => {
    setActiveScreen('updateMenu');
    onOpenUpdateModal && onOpenUpdateModal();
  };

  const handleCloseUpdateScreen = () => {
    setActiveScreen('main');
    onCloseUpdateModal && onCloseUpdateModal();
  };

  // Animation variants for screen transitions
  const screenVariants = {
    hidden: (direction) => ({
      x: direction * 20,
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 250, damping: 25 },
        opacity: { duration: 0.3 }
      }
    },
    exit: (direction) => ({
      x: direction * -20,
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 250, damping: 25 },
        opacity: { duration: 0.2 }
      }
    })
  };

  // Screen transition variants - keeping these for internal transitions
  // But simplifying the main modal animation to match the HelpModal

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ height: "auto", minHeight: "300px" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <div className="flex-grow" /> {/* Spacer to push the button to the right */}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait" initial={false}>
              {activeScreen === 'main' && (
                <motion.div
                  key="main"
                  custom={1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-6 space-y-4"
                >
                  {/* Role */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-sm text-gray-500 mb-1">Role</div>
                    <div 
                      className={`text-gray-800 font-medium ${getFontClass(roleLanguage)}`}
                      dir={getTextDirection(roleLanguage)}
                    >
                      {node.role || 'Not specified'}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-sm text-gray-500 mb-1">Department</div>
                    <div 
                      className={`text-gray-800 ${getFontClass(departmentLanguage)}`}
                      dir={getTextDirection(departmentLanguage)}
                    >
                      {node.department || 'Not specified'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveScreen('information')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>View Information</span>
                      <FileText size={18} />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveScreen('cv')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>View CV</span>
                      <ArrowRight size={18} />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleOpenUpdateScreen}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-white font-medium transition-colors"
                      style={{ backgroundColor: THEME.buttonColor }}
                    >
                      <span>Update Information</span>
                      <Edit size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
              
              {activeScreen === 'updateMenu' && (
                <motion.div
                  key="updateMenu"
                  custom={-1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-6 space-y-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCloseUpdateScreen}
                    className="w-full flex items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    <span>Back to Main Info</span>
                  </motion.button>
                  
                  <div className="pt-2 space-y-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveScreen('updatePersonal')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>Update Personal Information</span>
                      <User size={18} />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveScreen('updateHierarchical')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>Update Hierarchical Information</span>
                      <GitBranch size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {activeScreen === 'information' && (
                <motion.div
                  key="information"
                  custom={-1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <NodeInformation
                    node={node}
                    onBack={() => setActiveScreen('main')}
                    theme={THEME}
                  />
                </motion.div>
              )}
              
              {activeScreen === 'updatePersonal' && (
                <motion.div
                  key="updatePersonal"
                  custom={-1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <UpdatePersonalInfoSection
                    node={node}
                    onBack={() => setActiveScreen('updateMenu')}
                    folderId={folderId}
                    tableId={tableId}
                    folderStructure={folderStructure}
                    onUpdateComplete={onUpdateComplete}
                    theme={THEME}
                  />
                </motion.div>
              )}
              
              {activeScreen === 'updateHierarchical' && (
                <motion.div
                  key="updateHierarchical"
                  custom={-1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <UpdateHierarchicalInfoSection
                    node={node}
                    onBack={() => setActiveScreen('updateMenu')}
                    folderId={folderId}
                    tableId={tableId}
                    folderStructure={folderStructure}
                    onUpdateComplete={onUpdateComplete}
                    getParentNode={getParentNode}
                    theme={THEME}
                  />
                </motion.div>
              )}
              
              {activeScreen === 'cv' && (
                <motion.div
                  key="cv"
                  custom={-1}
                  variants={screenVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <CVTimelineSection
                    node={node}
                    folderId={folderId}
                    tableId={tableId}
                    onBack={() => setActiveScreen('main')}
                    theme={THEME}
                  />
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