import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, ArrowRight, ArrowRightCircle, ChevronDown } from 'lucide-react';
import Select from 'react-select';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import '../styles/datepicker.css';
import '../styles/scrollbar.css';
import '../styles/fonts.css';
import DatePickerWrapper from './DatePickerWrapper';
import PopupInfoModal from './PopupInfoModal';

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

const UpdateHierarchicalInfoSection = ({ node, onBack, folderId, tableId, onUpdateComplete, getParentNode }) => {
  const [updateType, setUpdateType] = useState(null);
  const [targetPerson, setTargetPerson] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [availablePersons, setAvailablePersons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentParent, setCurrentParent] = useState(null);
  const [dateRange, setDateRange] = useState([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date()
  ]);
  const [relevantTables, setRelevantTables] = useState([]);
  const [changeCount, setChangeCount] = useState(0);

  useEffect(() => {
    const parent = getParentNode(node.hierarchical_structure);
    setCurrentParent(parent || { name: 'Root' });
  }, [node.hierarchical_structure, getParentNode]);

  useEffect(() => {
    const fetchAvailablePersons = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/search/${folderId}/${tableId}`, {
          params: {
            query: '',
            columns: 'name,person_id,role,department,hierarchical_structure'
          }
        });
        
        if (response.data && response.data.results) {
          const persons = response.data.results
            .filter(person => person.hierarchical_structure !== node.hierarchical_structure)
            .map(person => ({
              value: person.hierarchical_structure,
              label: person.name,
              role: person.role,
              department: person.department,
              hierarchical_structure: person.hierarchical_structure
            }));
          setAvailablePersons(persons);
  
          if (updateType?.value === 'create_new') {
            setNewRole(node.role);
          }
        } else {
          console.warn("Unexpected response format when fetching available persons");
          setAvailablePersons([]);
        }
      } catch (error) {
        console.error("Error fetching available persons:", error);
        toast.error("Failed to fetch available persons. Please try again.");
        setAvailablePersons([]);
      }
    };
  
    fetchAvailablePersons();
  }, [folderId, tableId, node.hierarchical_structure, node.role, updateType]);

  const fetchRelevantTables = useCallback(async () => {
    if (!targetPerson) {
      toast.error("Please select a target person before fetching relevant tables.");
      return false;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/get_relevant_tables/${folderId}`, {
        params: {
          start_date: formatDateForAPI(dateRange[0]),
          end_date: formatDateForAPI(dateRange[1]),
          field_type: 'hierarchical_structure',
          field_value: targetPerson.hierarchical_structure
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
  }, [folderId, dateRange, targetPerson]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!updateType || !targetPerson || (updateType.value === 'create_new' && !newRole)) {
      toast.error("Please fill all required fields.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/update_hierarchical_structure/${folderId}`, {
        hierarchical_structure: node.hierarchical_structure,
        update_type: updateType.value,
        target_hierarchical_structure: targetPerson.hierarchical_structure,
        new_role: updateType.value === 'create_new' ? newRole : undefined,
        start_date: formatDateForAPI(dateRange[0]),
        end_date: formatDateForAPI(dateRange[1]),
        tables: relevantTables
      });

      if (response.data.message === "Hierarchical location updated across relevant tables") {
        toast.success("Hierarchical information updated successfully!");
        onUpdateComplete();
        onBack();
      } else if (response.data.error) {
        handleErrorResponse(response.data.error);
      } else {
        toast.warn("Update completed with some issues. Please check the results.");
        console.log("Update results:", response.data);
      }
    } catch (error) {
      console.error("Error updating hierarchical information:", error);
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
      case "Invalid update type. Must be 'create_new' or 'override'":
        toast.error("Invalid update type selected. Please try again.");
        break;
      case "New role must be provided for create_new operation":
        toast.error("Please provide a new role when creating a new node.");
        break;
      case "Invalid date format. Use YYYY-MM-DD":
        toast.error("Invalid date format. Please select valid dates.");
        break;
      case "Hierarchical structure not found in any tables within the date range":
        toast.error("The selected node was not found in any tables within the date range.");
        break;
      default:
        toast.error(`An error occurred: ${errorMessage}`);
    }
  };

  const handleChangeCount = (change) => {
    setChangeCount(prevCount => prevCount + change);
  };

  const renderUpdateTypeSelection = () => (
    <div className="bg-white rounded-xl p-3 shadow-md">
      <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Update Type</label>
      <Select
        options={[
          { value: 'override', label: 'Override Existing Node' },
          { value: 'create_new', label: 'Create New Node' }
        ]}
        value={updateType}
        onChange={setUpdateType}
        className="basic-select"
        classNamePrefix="select"
        placeholder="Select update type"
        isSearchable={false}
        styles={{
          control: (base) => ({
            ...base,
            borderColor: '#d1d5db',
            borderRadius: '0.75rem',
            padding: '0.25rem',
            boxShadow: 'none',
            fontFamily: 'Merriweather, serif',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected ? '#3b82f6' : 'white',
            color: state.isSelected ? 'white' : '#1f2937',
            fontSize: '0.875rem',
            fontWeight: '500',
            fontFamily: 'Merriweather, serif',
            padding: '0.5rem 1rem',
            '&:hover': {
              backgroundColor: '#bfdbfe',
              color: '#1f2937',
            },
          }),
          menu: (base) => ({
            ...base,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }),
          menuList: (base) => ({
            ...base,
            maxHeight: '150px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }),
          singleValue: (base) => ({
            ...base,
            fontFamily: 'Merriweather, serif',
          }),
          placeholder: (base) => ({
            ...base,
            fontFamily: 'Merriweather, serif',
          }),
        }}
        components={{
          IndicatorSeparator: () => null,
          DropdownIndicator: () => (
            <div className="px-2">
              <ChevronDown size={18} />
            </div>
          ),
        }}
      />
      <motion.div 
        className="mt-2 text-sm text-gray-600 font-merriweather"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="font-medium">Override:</span> Replace an existing node with this one.
        <br />
        <span className="font-medium">Create New:</span> Add this node as a child of another node.
      </motion.div>
    </div>
  );

  const renderTargetPersonSelection = () => (
    <div className="bg-white rounded-xl p-3 shadow-md mb-4">
      <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
        {updateType?.value === 'override' ? 'Person to Override' : 'New Parent Node'}
      </label>
      <div className="relative">
        <Select
          options={availablePersons}
          value={targetPerson}
          onChange={setTargetPerson}
          className="basic-select"
          classNamePrefix="select"
          placeholder="Select a person"
          styles={{
            control: (base) => ({
              ...base,
              borderColor: '#d1d5db',
              borderRadius: '0.75rem',
              padding: '0.25rem',
              boxShadow: 'none',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isSelected ? '#3b82f6' : 'white',
              color: state.isSelected ? 'white' : '#1f2937',
              fontSize: '0.875rem',
              fontWeight: '500',
              fontFamily: 'inherit',
              padding: '0.5rem 1rem',
              '&:hover': {
                backgroundColor: '#bfdbfe',
                color: '#1f2937',
              },
            }),
            menu: (base) => ({
              ...base,
              position: 'absolute',
              width: '100%',
              zIndex: 9999,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              borderRadius: '0.75rem',
            }),
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
            menuList: (base) => ({
              ...base,
              maxHeight: '200px',
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: '#555',
              },
            }),
          }}
          formatOptionLabel={({ label, role, department, hierarchical_structure }) => (
            <div className="text-left">
              <div className="font-semibold">{label}</div>
              <div className="text-xs text-gray-500">{role} - {department}</div>
            </div>
          )}
          components={{
            IndicatorSeparator: () => null,
            DropdownIndicator: () => (
              <div className="px-2">
                <ChevronDown size={18} />
              </div>
            ),
          }}
          menuPortalTarget={document.body}
        />
      </div>
    </div>
  );
  
  const renderNewRoleInput = () => {
    const language = getLanguage(newRole);
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl p-3 shadow-md mt-4"
      >
        <label htmlFor="newRole" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">New Role</label>
        <input
          type="text"
          id="newRole"
          name="newRole"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getFontClass(language)}`}
          dir={getTextDirection(language)}
          placeholder="Enter the new role"
        />
      </motion.div>
    );
  };

  const renderDateRangeSelection = () => (
    <div className="bg-white rounded-xl p-3 shadow-md mt-4">
      <label htmlFor="dateRange" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 text-center">
        Apply changes to tables within date range
      </label>
      <div className="flex justify-center">
        <DatePickerWrapper
          date={dateRange}
          handleDateChange={setDateRange}
          isRange={true}
          placeholderText="Select date range"
          wrapperColor="bg-white"
          wrapperOpacity="bg-opacity-100"
        />
      </div>
    </div>
  );

  const renderReviewChanges = () => (
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
            {updateType?.value === 'override' ? (
              <>
                <ComparisonRow 
                  label="Person"
                  before={targetPerson?.label}
                  after={node.name}
                  onChangeCount={handleChangeCount}
                />
                <ComparisonRow 
                  label="Role"
                  before={node.role}
                  after={targetPerson?.role}
                  onChangeCount={handleChangeCount}
                />
                <ComparisonRow 
                  label="Department"
                  before={node.department}
                  after={targetPerson?.department}
                  onChangeCount={handleChangeCount}
                />
              </>
            ) : (
              <>
                <ComparisonRow 
                  label="Parent"
                  before={currentParent?.name || 'Root'}
                  after={targetPerson?.label}
                  onChangeCount={handleChangeCount}
                />
                <ComparisonRow 
                  label="Role"
                  before={node.role}
                  after={newRole}
                  onChangeCount={handleChangeCount}
                />
                <ComparisonRow 
                  label="Department"
                  before={node.department}
                  after={targetPerson?.department}
                  onChangeCount={handleChangeCount}
                />
              </>
            )}
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {renderUpdateTypeSelection()}
            <AnimatePresence mode="wait">
              {updateType && (
                <motion.div
                  key={updateType.value}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {renderTargetPersonSelection()}
                  {updateType.value === 'create_new' && renderNewRoleInput()}
                </motion.div>
              )}
            </AnimatePresence>
            {renderDateRangeSelection()}
          </>
        );
      case 2:
        return renderReviewChanges();
      default:
        return null;
    }
  };

  const handleReviewChanges = async () => {
    if (!updateType || !targetPerson) {
      toast.warning("Please select an update type and target person before proceeding.");
      return;
    }
    
    if (updateType.value === 'create_new' && !newRole.trim()) {
      toast.warning("Please enter a new role for the 'Create New Node' operation.");
      return;
    }
    
    const tablesFound = await fetchRelevantTables();
    if (tablesFound) {
      setCurrentStep(2);
    }
  };

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
                renderNavigationButton(handleReviewChanges, <ArrowRight size={20} className="ml-2" />, "Review Changes")
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

export default UpdateHierarchicalInfoSection;