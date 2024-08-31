import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, ArrowRight, ChevronDown } from 'lucide-react';
import Select from 'react-select';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import '../styles/scrollbar.css';
import '../styles/fonts.css';

const API_BASE_URL = "http://localhost:5000";

const UpdateHierarchicalInfoSection = ({ node, onBack, folderId, tableId, folderStructure, onUpdateComplete }) => {
  const [updateType, setUpdateType] = useState(null);
  const [targetPerson, setTargetPerson] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [availablePersons, setAvailablePersons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const fetchAvailablePersons = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/search/${folderId}/${tableId}`, {
          params: {
            query: '',
            columns: 'name,person_id,role,department'
          }
        });
        
        if (response.data && response.data.results) {
          const persons = response.data.results
            .filter(person => person.person_id !== node.person_id)
            .map(person => ({
              value: person.person_id,
              label: person.name,
              role: person.role,
              department: person.department
            }));
          setAvailablePersons(persons);
        } else {
          console.warn("Unexpected response format when fetching available persons");
          setAvailablePersons([]);
        }
      } catch (error) {
        console.error("Error fetching available persons:", error);
        toast.error("Failed to fetch available persons. Please try again.");
      }
    };

    fetchAvailablePersons();
  }, [folderId, tableId, node.person_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!updateType || !targetPerson || (updateType.value === 'create_new' && !newRole)) {
      toast.error("Please fill all required fields.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/update_hierarchical_structure/${folderId}/${tableId}`, {
        person_id: node.person_id,
        update_type: updateType.value,
        target_person_id: targetPerson.value,
        new_role: updateType.value === 'create_new' ? newRole : undefined
      });

      if (response.data.message === "Hierarchical location updated successfully") {
        toast.success("Hierarchical information updated successfully!");
        onUpdateComplete(); // Trigger the tree reset
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
      case "Person with ID not found in table":
        toast.error("The selected person was not found in the current table.");
        break;
      case "New parent node with ID not found":
        toast.error("The selected new parent node was not found.");
        break;
      case "Person to override with ID not found in table":
        toast.error("The person to override was not found in the current table.");
        break;
      default:
        toast.error(`An error occurred: ${errorMessage}`);
    }
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
        className="mt-2 text-sm text-gray-600"
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
    <div className="bg-white rounded-xl p-3 shadow-md">
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
          formatOptionLabel={({ label, role, department }) => (
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
      <div className="bg-white rounded-xl p-3 shadow-md">
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
      </div>
    );
  };

  const renderReviewChanges = () => (
    <div className="bg-white rounded-xl p-6 shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Changes</h3>
      <div className="space-y-3">
        <div className="flex items-center py-3 border-b border-gray-200">
          <div className="w-1/3 font-medium text-gray-700">Update Type</div>
          <div className="w-2/3 px-2">
            <span className="inline-block py-1 px-2 rounded bg-blue-100 text-blue-800 font-medium">
              {updateType?.label}
            </span>
          </div>
        </div>
        <div className="flex items-center py-3 border-b border-gray-200">
          <div className="w-1/3 font-medium text-gray-700">
            {updateType?.value === 'override' ? 'Person to Override' : 'New Parent Node'}
          </div>
          <div className="w-2/3 px-2">
            <span className="inline-block py-1 px-2 rounded bg-green-100 text-green-800 font-medium">
              {targetPerson?.label}
            </span>
          </div>
        </div>
        {updateType?.value === 'create_new' && (
          <div className="flex items-center py-3 border-b border-gray-200">
            <div className="w-1/3 font-medium text-gray-700">New Role</div>
            <div className="w-2/3 px-2">
              <span className="inline-block py-1 px-2 rounded bg-yellow-100 text-yellow-800 font-medium">
                {newRole}
              </span>
            </div>
          </div>
        )}
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
          <div className="space-y-4">
            {renderUpdateTypeSelection()}
            {updateType && renderTargetPersonSelection()}
            <AnimatePresence>
              {updateType?.value === 'create_new' && renderNewRoleInput()}
            </AnimatePresence>
          </div>
        );
      case 2:
        return renderReviewChanges();
      default:
        return null;
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
                renderNavigationButton(() => setCurrentStep(2), <ArrowRight size={20} className="ml-2" />, "Review Changes")
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