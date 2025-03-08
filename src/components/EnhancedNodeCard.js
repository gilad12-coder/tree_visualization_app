import React, { useState, useEffect } from 'react';
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
  const roleLanguage = getLanguage(node?.role || '');
  const departmentLanguage = getLanguage(node?.department || '');
  
  // Force a re-render when mounted to ensure content appears
  const [forceRender, setForceRender] = useState(0);
  useEffect(() => {
    // Force a re-render after mount to make content appear
    setForceRender(1);
  }, []);

  const handleOpenUpdateScreen = () => {
    setActiveScreen('updateMenu');
    onOpenUpdateModal && onOpenUpdateModal();
  };

  const handleCloseUpdateScreen = () => {
    setActiveScreen('main');
    onCloseUpdateModal && onCloseUpdateModal();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "calc(100vh - 40px)" }}>
        
        {/* Header - Fixed height */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <div className="flex-grow">
            {/* Add name if needed: <span className="font-medium">{node?.name}</span> */}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Dynamic with fixed constraints */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="relative">
            {/* Ensure everything renders with key={forceRender} */}
            <div key={forceRender}>
              {activeScreen === 'main' && (
                <div className="p-6 space-y-4">
                  {/* Role */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-sm text-gray-500 mb-1">Role</div>
                    <div 
                      className={`text-gray-800 font-medium ${getFontClass(roleLanguage)}`}
                      dir={getTextDirection(roleLanguage)}
                    >
                      {node?.role || 'Not specified'}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="text-sm text-gray-500 mb-1">Department</div>
                    <div 
                      className={`text-gray-800 ${getFontClass(departmentLanguage)}`}
                      dir={getTextDirection(departmentLanguage)}
                    >
                      {node?.department || 'Not specified'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      onClick={() => setActiveScreen('information')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>View Information</span>
                      <FileText size={18} />
                    </button>
                    
                    <button
                      onClick={() => setActiveScreen('cv')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>View CV</span>
                      <ArrowRight size={18} />
                    </button>
                    
                    <button
                      onClick={handleOpenUpdateScreen}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-white font-medium transition-colors"
                      style={{ backgroundColor: THEME.buttonColor }}
                    >
                      <span>Update Information</span>
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              )}
              
              {activeScreen === 'updateMenu' && (
                <div className="p-6 space-y-4">
                  <button
                    onClick={handleCloseUpdateScreen}
                    className="w-full flex items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft size={18} className="mr-2" />
                    <span>Back to Main Info</span>
                  </button>
                  
                  <div className="pt-2 space-y-3">
                    <button
                      onClick={() => setActiveScreen('updatePersonal')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>Update Personal Information</span>
                      <User size={18} />
                    </button>
                    
                    <button
                      onClick={() => setActiveScreen('updateHierarchical')}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <span>Update Hierarchical Information</span>
                      <GitBranch size={18} />
                    </button>
                  </div>
                </div>
              )}

              {activeScreen === 'information' && (
                <div>
                  <NodeInformation
                    node={node}
                    onBack={() => setActiveScreen('main')}
                    theme={THEME}
                  />
                </div>
              )}
              
              {activeScreen === 'updatePersonal' && (
                <div>
                  <UpdatePersonalInfoSection
                    node={node}
                    onBack={() => setActiveScreen('updateMenu')}
                    folderId={folderId}
                    tableId={tableId}
                    folderStructure={folderStructure}
                    onUpdateComplete={onUpdateComplete}
                    theme={THEME}
                  />
                </div>
              )}
              
              {activeScreen === 'updateHierarchical' && (
                <div>
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
                </div>
              )}
              
              {activeScreen === 'cv' && (
                <div>
                  <CVTimelineSection
                    node={node}
                    folderId={folderId}
                    tableId={tableId}
                    onBack={() => setActiveScreen('main')}
                    theme={THEME}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNodeCard;