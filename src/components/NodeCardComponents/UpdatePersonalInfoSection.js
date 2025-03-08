import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  ArrowRightCircle, 
  User, 
  Briefcase, 
  Users, 
  Award, 
  Calendar, 
  Info, 
  AlertTriangle,
  Building,
  BookOpen,
  Heart,
  FileText,
  Table
} from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../../Utilities/languageUtils';
import axios from 'axios';
import { toast } from 'react-toastify';
import PopupInfoModal from '../HelperComponents/PopupInfoModal';
import '../../styles/datepicker.css';
import '../../styles/fonts.css';
import '../../styles/scrollbar.css';
import DatePickerWrapper from '../HelperComponents/DatePickerWrapper';

const API_BASE_URL = "http://localhost:5001";
const MAX_HEIGHT_FOR_REVIEW_CHANGES = 300;
const MAX_HEIGHT_FOR_TABLE_REVIEW = 300;

// Theme to match other modals
const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

// Format date for API
const formatDateForAPI = (date) => date ? date.toISOString().split('T')[0] : null;

// Field icon mapping
const FIELD_ICONS = {
  name: User,
  role: Briefcase,
  department: Users,
  rank: Award,
  birth_date: Calendar,
  organization_id: Building,
  personal_information: BookOpen,
  role_information: Info,
  is_dead: Heart
};

// Comparison row component for before/after view
const ComparisonRow = ({ label, before, after, onChangeCount, icon: Icon }) => {
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
    if (!text) return 'Not set';
    if (text === 'alive' || text === 'dead') return text;
    return text.length > 20 ? `${text.substring(0, 17)}...` : text;
  };

  const IconComponent = Icon || (() => null);

  return (
    <div className="flex items-center py-3 border-b border-gray-200 last:border-b-0">
      <div className="w-1/4 font-medium text-gray-700 flex items-center">
        <IconComponent size={16} className="mr-2 text-gray-500" />
        {label}
      </div>
      <div className="w-5/12 px-2">
        <span
          className={`inline-block py-1 px-2 rounded cursor-pointer ${hasChanged ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'}`}
          onClick={(e) => handleClick(before || 'Not set', e)}
        >
          {label === 'birth_date' && before instanceof Date 
            ? formatDateForAPI(before) 
            : truncateText(before || 'Not set')}
        </span>
      </div>
      <ArrowRightCircle className={`w-1/12 ${hasChanged ? 'text-gray-500' : 'text-gray-300'}`} size={16} />
      <div className="w-5/12 px-2">
        <span
          className={`inline-block py-1 px-2 rounded cursor-pointer ${hasChanged ? 'bg-gray-700 text-white font-medium' : 'bg-gray-100 text-gray-600'}`}
          onClick={(e) => handleClick(after || 'Not set', e)}
          style={{ backgroundColor: hasChanged ? THEME.primary : undefined }}
        >
          {label === 'birth_date' && after instanceof Date 
            ? formatDateForAPI(after) 
            : truncateText(after || 'Not set')}
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

// Main component
const UpdatePersonalInfoSection = ({ node, onBack, folderId, onUpdateComplete }) => {
  // Initialize form data with all possible node fields
  const [formData, setFormData] = useState({
    name: node.name || '',
    role: node.role || '',
    department: node.department || '',
    rank: node.rank || '',
    birth_date: node.birth_date ? new Date(node.birth_date) : null,
    organization_id: node.organization_id || '',
    personal_information: node.personal_information || '',
    role_information: node.role_information || '',
    is_dead: node.is_dead || 'alive',
  });

  const [currentTab, setCurrentTab] = useState('personal'); // 'personal', 'role', 'status'
  const [reviewTab, setReviewTab] = useState('changes'); // 'changes', 'tables'
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
      
      setRelevantTables(response.data.tables || []);

      if (!response.data.tables || response.data.tables.length === 0) {
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
        }, 1000);
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

  // Tab definitions for edit mode
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
      id: 'status',
      label: 'Status',
      icon: <Heart size={16} className="mr-1" />
    }
  ];

  // Tab definitions for review mode
  const reviewTabs = [
    {
      id: 'changes',
      label: 'Changes',
      icon: <FileText size={16} className="mr-1" />,
      count: changeCount
    },
    {
      id: 'tables',
      label: 'Affected Tables',
      icon: <Table size={16} className="mr-1" />,
      count: relevantTables.length
    }
  ];

  // Render form fields for personal information
  const renderPersonalInfoFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <User size={14} className="mr-1" />
          PERSONAL DETAILS
        </h3>
        <div className="space-y-3">
          {/* Name field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="name" className="block text-xs font-medium text-gray-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.name))}`}
              dir={getTextDirection(getLanguage(formData.name))}
            />
          </div>

          {/* Birth date field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="birth_date" className="block text-xs font-medium text-gray-500 mb-1">
              Birth Date
            </label>
            <DatePickerWrapper
              date={formData.birth_date}
              handleDateChange={handleDateChange}
              placeholderText="Select birth date"
              wrapperColor="bg-white"
              wrapperOpacity="bg-opacity-100"
              containerClassName="w-full"
            />
          </div>

          {/* Personal information */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="personal_information" className="block text-xs font-medium text-gray-500 mb-1">
              Additional Personal Information
            </label>
            <textarea
              id="personal_information"
              name="personal_information"
              value={formData.personal_information || ''}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.personal_information))}`}
              dir={getTextDirection(getLanguage(formData.personal_information))}
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );

  // Render form fields for role information
  const renderRoleInfoFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <Briefcase size={14} className="mr-1" />
          ROLE & POSITION
        </h3>
        <div className="space-y-3">
          {/* Role field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="role" className="block text-xs font-medium text-gray-500 mb-1">
              Position/Role
            </label>
            <input
              type="text"
              id="role"
              name="role"
              value={formData.role || ''}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.role))}`}
              dir={getTextDirection(getLanguage(formData.role))}
            />
          </div>

          {/* Department field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="department" className="block text-xs font-medium text-gray-500 mb-1">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.department))}`}
              dir={getTextDirection(getLanguage(formData.department))}
            />
          </div>

          {/* Rank field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="rank" className="block text-xs font-medium text-gray-500 mb-1">
              Rank
            </label>
            <input
              type="text"
              id="rank"
              name="rank"
              value={formData.rank || ''}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.rank))}`}
              dir={getTextDirection(getLanguage(formData.rank))}
            />
          </div>

          {/* Organization ID field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="organization_id" className="block text-xs font-medium text-gray-500 mb-1">
              Organization ID
            </label>
            <input
              type="text"
              id="organization_id"
              name="organization_id"
              value={formData.organization_id || ''}
              onChange={handleInputChange}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.organization_id))}`}
              dir={getTextDirection(getLanguage(formData.organization_id))}
            />
          </div>

          {/* Role information */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label htmlFor="role_information" className="block text-xs font-medium text-gray-500 mb-1">
              Additional Role Information
            </label>
            <textarea
              id="role_information"
              name="role_information"
              value={formData.role_information || ''}
              onChange={handleInputChange}
              rows={4}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.role_information))}`}
              dir={getTextDirection(getLanguage(formData.role_information))}
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );

  // Render status fields
  const renderStatusFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <Heart size={14} className="mr-1" />
          STATUS INFORMATION
        </h3>
        <div className="space-y-3">
          {/* Status field */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Current Status
            </label>
            <div className="flex items-center space-x-6">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="is_dead"
                  value="alive"
                  checked={formData.is_dead === 'alive'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="is_dead"
                  value="dead"
                  checked={formData.is_dead === 'dead'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Inactive/Removed</span>
              </label>
            </div>
          </div>

          {/* Hierarchical structure (readonly) */}
          <div className="bg-white rounded-md p-3 border border-gray-200">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Hierarchical Structure
            </label>
            <div className="p-2 bg-gray-50 rounded border border-gray-100 text-gray-700 font-mono text-xs break-all overflow-auto max-h-20 custom-scrollbar">
              {node.hierarchical_structure || 'Not available'}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              To update hierarchical structure, please use the Hierarchical Update tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDateRangeSelection = () => (
    <div className="p-3 bg-gray-50 rounded-md border border-gray-200 mt-4">
      <div className="flex items-center mb-3 pb-2 border-b border-gray-200">
        <Calendar size={16} className="text-gray-600 mr-2" />
        <h3 className="text-sm font-medium text-gray-800">Data Range Selection</h3>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Select the date range for tables that should be updated with this information.
      </p>
      <DatePickerWrapper
        date={dateRange}
        handleDateChange={handleDateRangeChange}
        isRange={true}
        placeholderText="Select date range"
        wrapperColor="bg-white"
        wrapperOpacity="bg-opacity-100"
      />
    </div>
  );
  
  // Render changes tab content for review
  const renderChangesContent = () => {
    const fieldsToCompare = [
      'name', 'role', 'department', 'rank', 'birth_date', 
      'organization_id', 'personal_information', 'role_information', 'is_dead'
    ];
    
    const formatValue = (key, value) => {
      if (key === 'birth_date') {
        return value instanceof Date ? formatDateForAPI(value) : value;
      }
      return value;
    };
  
    return (
      <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
        <div
          className="overflow-y-auto custom-scrollbar"
          style={{ maxHeight: `${MAX_HEIGHT_FOR_REVIEW_CHANGES}px` }}
        >
          <div className="space-y-2">
            {fieldsToCompare.map(key => (
              <ComparisonRow 
                key={key}
                label={key.replace(/_/g, ' ')}
                before={formatValue(key, node[key])}
                after={formatValue(key, formData[key])}
                onChangeCount={handleChangeCount}
                icon={FIELD_ICONS[key]}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render tables tab content for review
  const renderTablesContent = () => {
    return (
      <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
        <div
          className="overflow-y-auto custom-scrollbar"
          style={{ maxHeight: `${MAX_HEIGHT_FOR_TABLE_REVIEW}px` }}
        >
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading relevant tables...</p>
            </div>
          ) : relevantTables.length > 0 ? (
            <div className="space-y-2">
              {relevantTables.map((table, index) => (
                <div key={index} className="bg-white rounded-md p-2 border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="w-5 h-5 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full text-xs font-bold mr-2">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{table.name}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {new Date(table.upload_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No tables found in the selected date range.</p>
              <p className="text-xs text-gray-500 mt-1">Try adjusting the date range to include more tables.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFormContent = () => {
    switch (currentTab) {
      case 'personal':
        return renderPersonalInfoFields();
      case 'role':
        return renderRoleInfoFields();
      case 'status':
        return renderStatusFields();
      default:
        return renderPersonalInfoFields();
    }
  };

  const renderReviewContent = () => {
    switch (reviewTab) {
      case 'changes':
        return renderChangesContent();
      case 'tables':
        return renderTablesContent();
      default:
        return renderChangesContent();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Tab navigation */}
            <div className="flex border-b border-gray-100 mb-4">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex-1 py-2 px-1 flex items-center justify-center transition-colors relative text-xs ${
                    currentTab === tab.id
                      ? `text-${THEME.primary} bg-white font-medium`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    color: currentTab === tab.id ? THEME.primary : undefined
                  }}
                >
                  {tab.icon}
                  <span className={currentTab === tab.id ? 'font-medium' : ''}>{tab.label}</span>
                  {currentTab === tab.id && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: THEME.primary }}
                      layoutId="activeEditTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    ></motion.div>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                {renderFormContent()}
              </motion.div>
            </AnimatePresence>
            
            {/* Date range selection */}
            {renderDateRangeSelection()}
          </>
        );
      case 2:
        return (
          <>
            {/* Review tab navigation */}
            <div className="flex border-b border-gray-100 mb-4">
              {reviewTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setReviewTab(tab.id)}
                  className={`flex-1 py-2 px-1 flex items-center justify-center transition-colors relative text-xs ${
                    reviewTab === tab.id
                      ? `text-${THEME.primary} bg-white font-medium`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  style={{
                    color: reviewTab === tab.id ? THEME.primary : undefined
                  }}
                >
                  {tab.icon}
                  <span className={reviewTab === tab.id ? 'font-medium' : ''}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {reviewTab === tab.id && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: THEME.primary }}
                      layoutId="activeReviewTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    ></motion.div>
                  )}
                </button>
              ))}
            </div>

            {/* Review tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={reviewTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                {renderReviewContent()}
              </motion.div>
            </AnimatePresence>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
    onClick={(e) => e.target === e.currentTarget && onBack()}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      className="bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col"
      style={{ maxHeight: "90vh" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          <span>Back to Main Info</span>
        </motion.button>
      </div>

        {/* Profile header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-medium text-gray-900 flex items-center">
            <span>{node.name || 'Unknown Name'}</span>
            {node.is_dead?.toLowerCase() === 'dead' && (
              <span className="ml-2 text-gray-400 text-xs">
                (Inactive)
              </span>
            )}
          </h2>
          <div className="flex items-center mt-1 text-gray-500 text-sm">
            <Briefcase size={14} className="mr-1" />
            <span>{node.role || 'Role not specified'}</span>
            {node.department && (
              <>
                <span className="mx-2 text-gray-300">•</span>
                <span>{node.department}</span>
              </>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >

                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {currentStep === 1 ? (
              <>
                <button
                  onClick={async () => {
                    const tablesFound = await fetchRelevantTables();
                    if (tablesFound) {
                      setCurrentStep(2);
                    }
                  }}
                  className="w-full flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: THEME.buttonColor }}
                >
                  <span>Review Changes</span>
                  <ArrowRight size={18} className="ml-2" />
                </button>
              </>
            ) : (
              <div className="w-full flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  <span>Edit Information</span>
                </button>
                
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || relevantTables.length === 0}
                  className={`flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors ${isLoading || relevantTables.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: THEME.buttonColor }}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      <span>Confirm Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UpdatePersonalInfoSection;