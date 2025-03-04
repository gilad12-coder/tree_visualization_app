import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, BookOpen, Briefcase, Heart, Calendar, BadgeInfo, Award, Building } from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import DOMPurify from 'dompurify';
import '../styles/fonts.css';

const NodeInformation = ({ node, onBack }) => {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'role', or 'personal_info'
  const [formattedPersonalInfo, setFormattedPersonalInfo] = useState('');
  const [formattedRoleInfo, setFormattedRoleInfo] = useState('');
  const contentRef = useRef(null);
  
  const personalInfoLanguage = getLanguage(node.personal_information || '');
  const roleInfoLanguage = getLanguage(node.role_information || '');

  // Calculate age from birth date
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(node.birth_date);

  // Format information text with enhanced styling
  const formatInformationText = (text) => {
    if (!text) return '';
    
    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const textWithLinks = text.replace(
      urlRegex,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"><span>$1</span><svg class="w-3 h-3 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>'
    );
    
    // Enhanced formatting for key information
    let enhancedText = textWithLinks;
    
    // Highlight years (e.g., 2015, 2020-2022)
    enhancedText = enhancedText.replace(/\b(19|20)\d{2}(-\d{2,4})?\b/g, '<span class="font-medium text-blue-700">$&</span>');
    
    // Highlight education and credentials
    const credentialPatterns = [
      /\b(MBA|PhD|BS|BA|MS|MD|JD|CPA|CFA|SHRM|CompTIA)\b/g,
      /\b([A-Z][a-z]+ University|University of [A-Z][a-z]+|College of [A-Z][a-z]+|School of [A-Z][a-z]+)\b/g
    ];
    
    credentialPatterns.forEach(pattern => {
      enhancedText = enhancedText.replace(pattern, '<span class="font-medium text-indigo-700">$&</span>');
    });
    
    // Highlight job titles
    enhancedText = enhancedText.replace(/\b(CEO|CFO|CTO|COO|VP|Director|Manager|Lead|Head|Principal|Senior)\b/g, 
      '<span class="font-medium text-emerald-700">$&</span>');
    
    // Handle paragraphs (double line breaks)
    enhancedText = enhancedText.replace(/\n\n+/g, '</p><p class="mt-4">');
    
    // Handle single line breaks
    enhancedText = enhancedText.replace(/\n/g, '<br />');
    
    // Wrap in paragraph tags
    const wrappedText = `<p>${enhancedText}</p>`;
    
    // Return the sanitized and formatted text
    return DOMPurify.sanitize(wrappedText);
  };

  // Format information texts when node data changes
  useEffect(() => {
    setFormattedPersonalInfo(formatInformationText(node.personal_information));
    setFormattedRoleInfo(formatInformationText(node.role_information));
  }, [node.personal_information, node.role_information]);

  // Format status based on is_dead field
  const getStatusDisplay = () => {
    const status = node.is_dead?.toLowerCase();
    
    if (status === 'dead' || status === 'true' || status === 'yes') {
      return {
        text: 'Deceased',
        className: 'bg-gray-200 text-gray-800'
      };
    } else if (status === 'unknown') {
      return {
        text: 'Status Unknown',
        className: 'bg-yellow-100 text-yellow-800'
      };
    } else {
      return {
        text: 'Active',
        className: 'bg-green-100 text-green-800'
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Personal details in a structured format
  const personalDetails = [
    { 
      icon: <Calendar className="text-blue-600" size={16} />,
      label: "BIRTH DATE", 
      value: node.birth_date ? `${new Date(node.birth_date).toLocaleDateString()} (Age: ${age})` : 'Not available' 
    },
    { 
      icon: <BadgeInfo className="text-indigo-600" size={16} />,
      label: "PERSON ID", 
      value: node.person_id || 'Not specified' 
    },
    { 
      icon: <Award className="text-amber-600" size={16} />,
      label: "RANK", 
      value: node.rank || 'Not specified' 
    },
    { 
      icon: <Building className="text-emerald-600" size={16} />,
      label: "ORGANIZATION ID", 
      value: node.organization_id || 'Not specified' 
    },
    { 
      icon: <Heart className={node.is_dead?.toLowerCase() === 'dead' ? "text-gray-600" : "text-red-600"} size={16} />,
      label: "STATUS", 
      value: (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.className}`}>
          {statusDisplay.text}
        </span>
      )
    }
  ];

  // Tab configuration
  const tabs = [
    {
      id: 'personal',
      label: 'Personal Details',
      icon: <User size={16} className="mr-1" />
    },
    {
      id: 'role',
      label: 'Role Information',
      icon: <Briefcase size={16} className="mr-1" />
    },
    {
      id: 'personal_info',
      label: 'Personal Information',
      icon: <BookOpen size={16} className="mr-1" />
    }
  ];

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm border border-gray-200">
      {/* Back button with styling matching the previous component */}
      <div className="p-6 space-y-4">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-2 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center"
        >
          <ArrowLeft size={20} className="mr-2" />
          <span className="font-bold">Back to Main Info</span>
        </motion.button>
      </div>

      {/* Profile header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <span>{node.name || 'Unknown Name'}</span>
          {node.is_dead?.toLowerCase() === 'dead' && (
            <span className="ml-2 text-gray-400 text-xs">
              (Deceased)
            </span>
          )}
        </h2>
        <div className="flex items-center mt-1 text-gray-600 text-sm">
          <Briefcase size={14} className="mr-1" />
          <span>{node.role || 'Role not specified'}</span>
          <span className="mx-2">•</span>
          <span>{node.department || 'Department not specified'}</span>
        </div>
      </div>

      {/* Tab navigation - with compact styling */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-1 flex items-center justify-center transition-colors relative text-xs ${
              activeTab === tab.id
                ? 'text-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            <span className="font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                layoutId="activeTab"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              ></motion.div>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-3 bg-gray-50 min-h-[250px]">
        <AnimatePresence mode="wait">
          {activeTab === 'personal' && (
            <motion.div
              key="personal-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="divide-y divide-gray-100">
                {personalDetails.map((item, index) => (
                  <motion.div 
                    key={index} 
                    className="p-3 flex items-center space-x-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs font-medium text-gray-500">{item.label}</h3>
                      <div className="text-gray-800 text-sm">{item.value}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          
          {activeTab === 'role' && (
            <motion.div
              key="role-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Role information header */}
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-base text-gray-800">{node.role || 'Role not specified'}</h3>
                    <p className="text-gray-600 text-xs">{node.department || 'Department not specified'}</p>
                  </div>
                  {node.rank && (
                    <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      Rank: {node.rank}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hierarchical structure - Moved to role tab */}
              <div className="p-3 border-b border-gray-100">
                <h3 className="text-xs font-medium text-gray-500 mb-1">HIERARCHICAL STRUCTURE</h3>
                <p className="bg-gray-50 p-2 rounded text-blue-800 font-mono text-xs break-all overflow-y-auto max-h-24">
                  {node.hierarchical_structure || 'Not available'}
                </p>
              </div>
              
              {/* Role information content with scrolling */}
              {formattedRoleInfo ? (
                <div className="p-3">
                  <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                    <Briefcase size={14} className="mr-1" />
                    ROLE INFORMATION
                  </h3>
                  <div 
                    className={`${getFontClass(roleInfoLanguage)} overflow-y-auto max-h-60 rounded-md bg-gray-50 p-3`}
                    dir={getTextDirection(roleInfoLanguage)}
                    ref={contentRef}
                  >
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      dangerouslySetInnerHTML={{ __html: formattedRoleInfo }} 
                      className="prose max-w-none text-gray-800 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 text-gray-500">
                  <Briefcase size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No role information available for this profile.</p>
                </div>
              )}
            </motion.div>
          )}
          
          {activeTab === 'personal_info' && (
            <motion.div
              key="personal-info-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm"
            >
              {/* Personal Information Content with improved scrolling */}
              {formattedPersonalInfo ? (
                <div className="p-3">
                  <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                    <User size={14} className="mr-1" />
                    PERSONAL INFORMATION
                  </h3>
                  <div 
                    className={`${getFontClass(personalInfoLanguage)} overflow-y-auto max-h-60 rounded-md bg-gray-50 p-3`}
                    dir={getTextDirection(personalInfoLanguage)}
                  >
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      dangerouslySetInnerHTML={{ __html: formattedPersonalInfo }} 
                      className="prose max-w-none text-gray-800 text-sm leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No personal information available.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NodeInformation;