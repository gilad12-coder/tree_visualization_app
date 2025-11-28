import React, { useState, useRef } from 'react';
import { Briefcase, Hash, Award, UserCheck, HelpCircle } from 'lucide-react';
import PopupInfoModal from '../HelperComponents/PopupInfoModal.js';

const ResultCard = ({ result, isSelected, onSelect, theme }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const iconRef = useRef(null);

  const fields = [
    { key: 'department', label: 'Department', Icon: Briefcase },
    { key: 'organization_id', label: 'Organization', Icon: Briefcase },
    { key: 'person_id', label: 'Person ID', Icon: Hash },
    { key: 'rank', label: 'Rank', Icon: Award },
    { key: 'role', label: 'Role', Icon: UserCheck },
  ];

  const truncate = (value, num) => {
    if (value == null) return 'N/A';
    const str = String(value);
    if (str.length <= num) {
      return str;
    }
    return str.slice(0, num) + '...';
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    setIsPopupOpen(!isPopupOpen);
  };

  const popupContent = {
    matchedTerms: result.matched_terms || [],
    matchedColumns: result.matched_columns || [],
  };

  // Define custom styles directly instead of using Tailwind classes for colors
  const cardStyle = {
    backgroundColor: theme.bgGray,
    borderWidth: isSelected ? '1px' : '1px',
    borderColor: isSelected ? '#374151' : theme.borderColor, // More subtle dark gray
    boxShadow: isSelected ? '0 0 0 1px #4B5563' : 'none', // Thinner, lighter shadow
    transition: 'all 0.2s ease'
  };

  const iconStyle = {
    color: 'rgba(156, 163, 175, 1)' // text-gray-400 equivalent
  };

  const iconHoverStyle = {
    color: '#4B5563' // Medium gray on hover, more subtle
  };

  return (
    <div
      className="rounded-lg shadow-sm overflow-hidden cursor-pointer relative"
      style={cardStyle}
      onClick={() => onSelect(result.hierarchical_structure)}
    >
      <div className="absolute top-2 right-2">
        <HelpCircle
          ref={iconRef}
          size={18}
          className="transition-colors cursor-pointer"
          style={iconStyle}
          onMouseOver={(e) => e.currentTarget.style.color = iconHoverStyle.color}
          onMouseOut={(e) => e.currentTarget.style.color = iconStyle.color}
          onClick={handleInfoClick}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-3 pr-6">{truncate(result.name, 20)}</h3>
        <div className="space-y-2">
          {fields.map(({ key, label, Icon }) => (
            <div key={key} className="flex items-center text-sm">
              <Icon 
                size={14} 
                className="mr-2 flex-shrink-0" 
                style={{ color: '#4B5563' }} // Softened to medium gray
              />
              <span className="text-gray-600 mr-1">{label}:</span>
              <span className="font-medium text-gray-800" title={String(result[key])}>
                {truncate(result[key], 20)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <PopupInfoModal
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        content={popupContent}
        title="Match Information"
        triggerRef={iconRef}
      />
    </div>
  );
};

export default ResultCard;