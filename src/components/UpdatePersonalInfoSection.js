import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Save, ArrowRightCircle } from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import axios from 'axios';
import { toast } from 'react-toastify';
import PopupInfoModal from './PopupInfoModal';
import '../styles/datepicker.css';
import '../styles/fonts.css';
import '../styles/scrollbar.css';
import DatePickerWrapper from './DatePickerWrapper';

const API_BASE_URL = "http://localhost:5000";
const MAX_HEIGHT_FOR_REVIEW_CHANGES = 200;
const MAX_HEIGHT_FOR_TABLE_REVIEW = 100;

const formatDateForAPI = (date) => date.toISOString().split('T')[0];

const ComparisonRow = ({ label, before, after, onChangeCount }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupContent, setPopupContent] = useState('');
  const triggerRef = useRef(null);

  const hasChanged = before !== after;

  useEffect(() => {
    if (hasChanged) {
      onChangeCount(1);
    }
    return () => {
      if (hasChanged) {
        onChangeCount(-1);
      }
    };
  }, [hasChanged, onChangeCount]);

  const handleClick = (content, event) => {
    triggerRef.current = event.currentTarget;
    setPopupContent(content);
    setIsPopupOpen(true);
  };

  const truncateText = (text) => {
    return text && text.length > 10 ? `${text.substring(0, 5)}...` : text || 'Not set';
  };

  return (
    <div className="flex items-center py-3 border-b border-gray-200 last:border-b-0">
      <div className="w-1/4 font-medium text-gray-700">{label}</div>
      <div className="w-5/12 px-2">
        <span
          className={`inline-block py-1 px-2 rounded cursor-pointer ${hasChanged ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
          onClick={(e) => handleClick(before || 'Not set', e)}
        >
          {truncateText(before || 'Not set')}
        </span>
      </div>
      <ArrowRightCircle className={`w-1/12 ${hasChanged ? 'text-blue-500' : 'text-gray-300'}`} size={20} />
      <div className="w-5/12 px-2">
        <span
          className={`inline-block py-1 px-2 rounded cursor-pointer ${hasChanged ? 'bg-green-100 text-green-800 font-medium' : 'bg-gray-100 text-gray-800'}`}
          onClick={(e) => handleClick(after || 'Not set', e)}
        >
          {truncateText(after || 'Not set')}
        </span>
      </div>
      <PopupInfoModal
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        content={popupContent}
        title="Field Value"
        triggerRef={triggerRef}
      />
    </div>
  );
};

const UpdatePersonalInfoSection = ({ node, onBack, folderId, onUpdateComplete }) => {
  const [formData, setFormData] = useState({
    name: node.name || '',
    role: node.role || '',
    department: node.department || '',
    rank: node.rank || '',
    birth_date: node.birth_date ? new Date(node.birth_date) : null,
    organization_id: node.organization_id || '',
  });

  const [dateRange, setDateRange] = useState([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [relevantTables, setRelevantTables] = useState([]);
  const [changeCount, setChangeCount] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const fetchRelevantTables = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/get_relevant_tables/${folderId}`, {
        params: {
          start_date: formatDateForAPI(dateRange[0]),
          end_date: formatDateForAPI(dateRange[1]),
          field_type: 'person_id',
          field_value: node.person_id
        }
      });
      
      setRelevantTables(response.data.tables);

      if (response.data.tables.length === 0) {
        toast.warning("No tables found in the selected date range. Please adjust the dates and try again.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error fetching relevant tables:", error);
      toast.error("Failed to fetch relevant tables. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [folderId, dateRange, node.person_id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, birth_date: date }));
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleChangeCount = (change) => {
    setChangeCount(prevCount => prevCount + change);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const updatedFormData = {
      ...formData,
      birth_date: formData.birth_date ? formatDateForAPI(formData.birth_date) : null,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/update_node_by_person/${folderId}/${node.person_id}`, {
        start_date: formatDateForAPI(dateRange[0]),
        end_date: formatDateForAPI(dateRange[1]),
        updates: updatedFormData,
        tables: relevantTables
      });

      if (response.data.message === "Update operation completed") {
        toast.success("Personal information updated successfully!");

        timeoutRef.current = setTimeout(() => {
          onUpdateComplete();
          onBack();
        }, 500);
      } else if (response.data.error) {
        handleErrorResponse(response.data.error);
      } else {
        toast.warn("Update completed with some issues. Please check the results.");
        console.log("Update results:", response.data.results);
      }
    } catch (error) {
      console.error("Error updating personal information:", error);
      if (error.response && error.response.data && error.response.data.error) {
        handleErrorResponse(error.response.data.error);
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorResponse = (errorMessage) => {
    switch (errorMessage) {
      case "Missing required parameters":
        toast.error("Missing required information. Please fill all fields.");
        break;
      case "Invalid date format. Use YYYY-MM-DD":
        toast.error("Invalid date format. Please select valid dates.");
        break;
      case "No relevant tables found for the given person ID and date range":
        toast.error("The selected person was not found in any tables within the date range.");
        break;
      default:
        toast.error(`An error occurred: ${errorMessage}`);
    }
  };

  const renderFormFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(formData).map(([key, value]) => {
        const language = getLanguage(value);
        if (key === 'birth_date') {
          return (
            <div key={key} className="bg-white rounded-xl p-3 shadow-md">
              <label htmlFor={key} className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
                {key.replace('_', ' ')}
              </label>
              <DatePickerWrapper
                date={value}
                handleDateChange={handleDateChange}
                placeholderText="Select birth date"
                wrapperColor="bg-white"
                wrapperOpacity="bg-opacity-100"
              />
            </div>
          );
        }
        return (
          <div key={key} className="bg-white rounded-xl p-3 shadow-md">
            <label htmlFor={key} className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
              {key.replace('_', ' ')}
            </label>
            <input
              type="text"
              id={key}
              name={key}
              value={value}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getFontClass(language)}`}
              dir={getTextDirection(language)}
            />
          </div>
        );
      })}
    </div>
  );

  const renderDateRangeSelection = () => (
    <div className="bg-white rounded-xl p-3 shadow-md mt-4">
      <label htmlFor="dateRange" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 text-center">
        Apply changes to tables within date range
      </label>
      <div className="flex justify-center">
        <DatePickerWrapper
          date={dateRange}
          handleDateChange={handleDateRangeChange}
          isRange={true}
          placeholderText="Select date range"
          wrapperColor="bg-white"
          wrapperOpacity="bg-opacity-100"
        />
      </div>
    </div>
  );
  
  const renderBeforeAfterComparison = () => {
    const fieldsToCompare = ['name', 'role', 'department', 'rank', 'birth_date', 'organization_id'];
    const formatValue = (key, value) => {
      if (key === 'birth_date') {
        return value instanceof Date ? formatDateForAPI(value) : value;
      }
      return value;
    };
  
    return (
      <div className="bg-white rounded-xl p-6 shadow-md space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Review Changes ({changeCount} {changeCount === 1 ? 'change' : 'changes'})
          </h3>
          <div 
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: `${MAX_HEIGHT_FOR_REVIEW_CHANGES}px` }}
          >
            <div className="space-y-3">
              {fieldsToCompare.map(key => (
                <ComparisonRow 
                  key={key}
                  label={key.replace('_', ' ')}
                  before={formatValue(key, node[key])}
                  after={formatValue(key, formData[key])}
                  onChangeCount={handleChangeCount}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">
          Tables to be Updated ({relevantTables.length})
          </h4>
          <div 
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: `${MAX_HEIGHT_FOR_TABLE_REVIEW}px` }}
          >
            {isLoading ? (
              <p className="text-sm text-gray-600 italic text-center">Loading relevant tables...</p>
            ) : relevantTables.length > 0 ? (
              <ul className="space-y-2">
                {relevantTables.map((table, index) => (
                  <li key={index} className="bg-gray-50 rounded-md p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{table.name}</span>
                    <span className="text-xs text-gray-500">
                      Uploaded: {new Date(table.upload_date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-600 italic text-center">No tables found in the selected date range.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {renderFormFields()}
            {renderDateRangeSelection()}
          </>
        );
      case 2:
        return renderBeforeAfterComparison();
      default:
        return null;
    }
  };

  const renderNavigationButton = (onClick, icon, text, disabled = false, isUpdate = false) => (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full px-4 ${isUpdate ? 'py-3' : 'py-2'} bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      <span className="font-bold">{text}</span>
    </motion.button>
  );

  return (
    <div className="p-3 max-w-7xl mx-auto w-full">
      {currentStep === 1 ? (
        renderNavigationButton(onBack, <ArrowLeft size={20} className="mr-2" />, "Back to Main Info")
      ) : (
        renderNavigationButton(() => setCurrentStep(1), <ArrowLeft size={20} className="mr-2" />, "Previous")
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 shadow-lg mt-3"
        >
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            {renderStepContent()}
            
            <div className="flex justify-end">
              {currentStep === 1 ? (
                renderNavigationButton(async () => {
                  const tablesFound = await fetchRelevantTables();
                  if (tablesFound) {
                    setCurrentStep(2);
                  }
                }, <ArrowRight size={20} className="ml-2" />, "Review Changes")
              ) : (
                renderNavigationButton(handleSubmit, <Save size={20} className="mr-2" />, isLoading ? "Updating..." : "Confirm Changes", isLoading, true)
              )}
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default UpdatePersonalInfoSection;