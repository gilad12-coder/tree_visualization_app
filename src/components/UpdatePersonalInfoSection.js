import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Calendar, CheckSquare } from 'lucide-react';
import { getLanguage, getFontClass, getTextDirection } from '../Utilities/languageUtils';
import axios from 'axios';
import { toast } from 'react-toastify';
import Select, { components } from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker.css';
import '../styles/fonts.css';

const API_BASE_URL = "http://localhost:5000";

const convertToUTCDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const formatDateForAPI = (date) => date.toISOString().split('T')[0];

const UpdatePersonalInfoSection = ({ node, onBack, folderId, tableId, folderStructure, onUpdateComplete }) => {
  const [formData, setFormData] = useState({
    name: node.name || '',
    role: node.role || '',
    department: node.department || '',
    rank: node.rank || '',
    birth_date: node.birth_date ? new Date(node.birth_date) : null,
    organization_id: node.organization_id || '',
  });

  const [selectedTables, setSelectedTables] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (folderStructure && Array.isArray(folderStructure)) {
      const currentFolder = folderStructure.find(folder => folder.id === folderId);
      if (currentFolder && currentFolder.tables) {
        const tables = currentFolder.tables.map(table => ({ value: table.id, label: table.name }));
        setAvailableTables([
          { value: 'all', label: 'Select All Tables' },
          ...tables
        ]);

        const currentTable = tables.find(table => table.value === tableId);
        if (currentTable) {
          setSelectedTables([currentTable]);
        }
      } else {
        console.warn(`No tables found for folder ID ${folderId}`);
        setAvailableTables([]);
      }
    } else {
      console.warn('folderStructure is undefined or not an array');
      setAvailableTables([]);
    }
  }, [folderStructure, folderId, tableId]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, birth_date: date }));
  };

  const handleTableSelection = (selectedOptions) => {
    if (selectedOptions.some(option => option.value === 'all')) {
      setSelectedTables(availableTables.filter(table => table.value !== 'all'));
    } else {
      setSelectedTables(selectedOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const updatedFormData = {
      ...formData,
      birth_date: formData.birth_date ? formatDateForAPI(convertToUTCDate(formData.birth_date)) : null,
    };

    try {
      const response = await axios.post(`${API_BASE_URL}/update_node/${folderId}`, {
        table_ids: selectedTables.map(table => table.value),
        search_query: node.name,
        search_column: 'name',
        updates: updatedFormData
      });

      if (response.data.message === "Update operation completed") {
        toast.success("Personal information updated successfully!");
        
        timeoutRef.current = setTimeout(() => {
          onUpdateComplete();
          onBack();
        }, 500);
      } else {
        toast.warn("Update completed with some issues. Please check the results.");
        console.log("Update results:", response.data.results);
      }
    } catch (error) {
      console.error("Error updating personal information:", error);
      toast.error("Failed to update personal information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto w-full">
      <motion.button
        onClick={onBack}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full px-4 py-2 mb-4 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center"
      >
        <ArrowLeft size={20} className="mr-2" />
        <span className="font-bold">Back to Main Info</span>
      </motion.button>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg overflow-y-auto max-h-[80vh]">
        <h3 className="text-3xl font-black text-gray-800 tracking-tight font-merriweather text-center mb-6">
          Update Personal Information
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Object.entries(formData).map(([key, value]) => {
              const language = getLanguage(value);
              if (key === 'birth_date') {
                return (
                  <div key={key} className="bg-white rounded-xl p-4 shadow-md">
                    <label htmlFor={key} className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                      {key.replace('_', ' ')}
                    </label>
                    <div className="relative">
                      <DatePicker
                        selected={value}
                        onChange={handleDateChange}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select birth date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        yearDropdownItemNumber={100}
                        scrollableYearDropdown
                        popperClassName="date-picker-popper"
                        calendarClassName="custom-calendar"
                        wrapperClassName="date-picker-wrapper"
                      />
                      <Calendar size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                );
              }
              return (
                <div key={key} className="bg-white rounded-xl p-4 shadow-md">
                  <label htmlFor={key} className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                    {key.replace('_', ' ')}
                  </label>
                  <input
                    type="text"
                    id={key}
                    name={key}
                    value={value}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${getFontClass(language)}`}
                    dir={getTextDirection(language)}
                  />
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <label htmlFor="tables" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Apply changes to tables
            </label>
            <Select
              isMulti
              name="tables"
              options={availableTables}
              value={selectedTables}
              onChange={handleTableSelection}
              className="basic-multi-select"
              classNamePrefix="select"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#d1d5db',
                  borderRadius: '0.75rem',
                  padding: '0.25rem',
                  boxShadow: 'none',
                  '&:hover': {
                    borderColor: '#9ca3af',
                  },
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#e5e7eb',
                  borderRadius: '0.5rem',
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#bfdbfe' : 'white',
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
                  padding: '0.5rem 0',
                }),
              }}
              components={{
                Option: ({ children, ...props }) => (
                  <components.Option {...props}>
                    {props.data.value === 'all' && <CheckSquare size={16} className="inline-block mr-2" />}
                    {children}
                  </components.Option>
                ),
              }}
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full px-4 py-3 bg-blue-200 text-gray-800 rounded-xl hover:bg-blue-300 transition-colors flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Save size={20} className="mr-2" />
            <span className="font-bold">{isLoading ? 'Updating...' : 'Update Information'}</span>
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePersonalInfoSection;