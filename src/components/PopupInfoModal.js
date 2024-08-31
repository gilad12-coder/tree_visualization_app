import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../styles/scrollbar.css';

const PopupInfoModal = ({
  isOpen,
  onClose,
  content,
  title,
  triggerRef,
  width = 300,
  maxHeight = 200,
}) => {
  const popupRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({});

  useEffect(() => {
    const updatePopupPosition = () => {
      if (triggerRef?.current && popupRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const popupRect = popupRef.current.getBoundingClientRect();

        let top = triggerRect.bottom + window.scrollY;
        let left = triggerRect.left + window.scrollX;

        // Check if the popup would go off the right edge of the screen
        if (left + popupRect.width > window.innerWidth) {
          left = window.innerWidth - popupRect.width;
        }

        // Check if the popup would go off the bottom of the screen
        if (top + popupRect.height > window.innerHeight + window.scrollY) {
          top = triggerRect.top - popupRect.height + window.scrollY;
        }

        setPopupStyle({
          position: 'absolute',
          top: `${top}px`,
          left: `${left}px`,
          width: `${width}px`,
          maxHeight: `${maxHeight}px`,
        });
      }
    };

    if (isOpen) {
      updatePopupPosition();
      window.addEventListener('resize', updatePopupPosition);
      window.addEventListener('scroll', updatePopupPosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePopupPosition);
      window.removeEventListener('scroll', updatePopupPosition, true);
    };
  }, [isOpen, triggerRef, width, maxHeight]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && 
          (!triggerRef?.current || !triggerRef.current.contains(event.target))) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const renderContent = () => {
    if (typeof content === 'string') {
      return <p className="text-sm text-gray-700 whitespace-normal break-words">{content}</p>;
    }
    return (
      <div>
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Matched Terms:</h4>
          <div className="flex flex-wrap">
            {content.matchedTerms.map((term, index) => (
              <span key={index} className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium mr-1 mb-1 px-2 py-0.5 rounded">
                {term}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-1">Matched Columns:</h4>
          <div className="flex flex-wrap">
            {content.matchedColumns.map((column, index) => (
              <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs font-medium mr-1 mb-1 px-2 py-0.5 rounded">
                {column}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-50 bg-white bg-opacity-90 backdrop-filter backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-blue-200"
      style={popupStyle}
    >
      <div className="bg-blue-500 bg-opacity-20 px-4 py-2 flex justify-between items-center">
        {title && <span className="font-medium text-gray-700">{title}</span>}
        <button 
          onClick={onClose}
          className="text-gray-600 hover:text-gray-800 transition-colors ml-auto"
        >
          <X size={16} />
        </button>
      </div>
      <div className="p-4 overflow-y-auto custom-scrollbar" style={{maxHeight: `${maxHeight - 40}px`}}>
        {renderContent()}
      </div>
    </div>,
    document.body
  );
};

export default PopupInfoModal;