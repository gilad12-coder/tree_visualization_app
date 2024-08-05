import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Award, Briefcase } from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import '../styles/fonts.css';

const PersonalInfoSection = ({ node, onBack }) => {
  const calculateAge = (birthDate) => {
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

  const rankLanguage = getLanguage(node.rank);
  const orgIdLanguage = getLanguage(node.organization_id);

  const infoItems = [
    { 
      icon: Calendar, 
      label: "Birth Date & Age", 
      value: `${new Date(node.birth_date).toLocaleDateString()} (Age: ${age})`,
      language: 'en' // Assuming birth date is always in English format
    },
    { 
      icon: Award, 
      label: "Rank", 
      value: node.rank,
      language: rankLanguage
    },
    { 
      icon: Briefcase, 
      label: "Organization ID", 
      value: node.organization_id,
      language: orgIdLanguage
    },
  ];

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

      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg">
        <h3 className="text-3xl font-black text-gray-800 tracking-tight font-merriweather text-center mb-8">
          Personal Information
        </h3>

        <div className="space-y-6">
          {infoItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start">
                <div className="bg-blue-100 p-3 rounded-full mr-4">
                  <item.icon size={24} className="text-blue-600" />
                </div>
                <div className="flex-grow">
                  <h4 className="text-sm font-semibold text-black uppercase tracking-wide mb-1">
                    {item.label}
                  </h4>
                  <p 
                    className={`text-sm text-black ${getFontClass(item.language)}`}  // Changed from text-base to text-sm
                    dir={getTextDirection(item.language)}
                  >
                    <span className="block text-sm font-medium text-gray-700">
                      {new Date(node.birth_date).toLocaleDateString()}
                    </span>
                    <span className="block text-xs text-gray-600">
                      Age: {age}
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;
