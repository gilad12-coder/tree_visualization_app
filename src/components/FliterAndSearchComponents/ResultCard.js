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

  return (
    <div
      className={`rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all duration-200 relative border ${
        isSelected
          ? `ring-2 ring-[${theme.buttonHover}] border-[${theme.buttonHover}]`
          : `hover:shadow-md border-[${theme.borderColor}]`
      }`}
      style={{ backgroundColor: theme.bgGray }}
      onClick={() => onSelect(result.hierarchical_structure)}
    >
      <div className="absolute top-2 right-2">
        <HelpCircle
          ref={iconRef}
          size={18}
          className={`text-gray-400 hover:text-[${theme.buttonHover}] transition-colors cursor-pointer`}
          onClick={handleInfoClick}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-3 pr-6">{truncate(result.name, 20)}</h3>
        <div className="space-y-2">
          {fields.map(({ key, label, Icon }) => (
            <div key={key} className="flex items-center text-sm">
              <Icon size={14} className={`mr-2 text-[${theme.primary}] flex-shrink-0`} />
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