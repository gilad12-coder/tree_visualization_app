import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Briefcase, Home, Calendar, Info, Hash, ArrowLeft } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { getLanguage, getFontClass, getTextDirection } from '../../Utilities/languageUtils';

const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const NodeEditorModal = ({
  isOpen,
  onClose,
  onSave,
  nodeData = null,
  mode = 'add', // 'add' or 'edit'
  parentNode = null
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    department: '',
    rank: '',
    person_id: '',
    birth_date: '',
    personal_information: '',
    organization_id: '',
    organization_name: '',
    role_information: '',
    is_dead: false
  });

  const [errors, setErrors] = useState({});
  const [currentTab, setCurrentTab] = useState('personal'); // 'personal', 'role', 'organization'

  useEffect(() => {
    if (mode === 'edit' && nodeData) {
      setFormData({
        name: nodeData.name || '',
        role: nodeData.role || '',
        department: nodeData.department || '',
        rank: nodeData.rank || '',
        person_id: nodeData.person_id || '',
        birth_date: nodeData.birth_date || '',
        personal_information: nodeData.personal_information || '',
        organization_id: nodeData.organization_id || '',
        organization_name: nodeData.organization_name || '',
        role_information: nodeData.role_information || '',
        is_dead: nodeData.is_dead || false
      });
    } else if (mode === 'add' && parentNode) {
      // Inherit department and organization from parent
      setFormData(prev => ({
        ...prev,
        department: parentNode.department || '',
        organization_id: parentNode.organization_id || '',
        organization_name: parentNode.organization_name || ''
      }));
    }
  }, [mode, nodeData, parentNode]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    console.log('Validating form data:', formData);

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = t('nodeEditor.nameRequired', 'Name is required');
      console.log('Validation error: name is required');
    }

    if (!formData.role || !formData.role.trim()) {
      newErrors.role = t('nodeEditor.roleRequired', 'Role is required');
      console.log('Validation error: role is required');
    }

    setErrors(newErrors);
    console.log('Validation complete. Errors:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('NodeEditorModal - handleSubmit called');
    console.log('Form data:', formData);
    console.log('Mode:', mode);

    if (validate()) {
      console.log('Validation passed, calling onSave...');
      try {
        await onSave(formData);
        console.log('onSave completed successfully');
        onClose();
      } catch (error) {
        console.error('Error saving node:', error);
      }
    } else {
      console.log('Validation failed, errors:', errors);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'personal',
      label: t('nodeEditor.personalDetails', 'Personal'),
      icon: User
    },
    {
      id: 'role',
      label: t('nodeEditor.roleDetails', 'Role'),
      icon: Briefcase
    },
    {
      id: 'organization',
      label: t('nodeEditor.organizationDetails', 'Organization'),
      icon: Home
    }
  ];

  const renderPersonalFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <User size={14} className="mr-1 rtl:mr-0 rtl:ml-1" />
          {t('nodeEditor.personalInformation', 'Personal Information')}
        </h3>
        <div className="space-y-3">
          {/* Name */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="name" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.name', 'Full Name')} *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.name))}`}
              dir={getTextDirection(getLanguage(formData.name))}
              placeholder={t('nodeEditor.namePlaceholder', 'e.g., John Doe')}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Person ID */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="person_id" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.personId', 'Person ID')}
            </label>
            <input
              type="text"
              id="person_id"
              value={formData.person_id}
              onChange={(e) => handleChange('person_id', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('nodeEditor.personIdPlaceholder', 'e.g., 12345')}
            />
          </div>

          {/* Birth Date */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="birth_date" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.birthDate', 'Birth Date')}
            </label>
            <input
              type="date"
              id="birth_date"
              value={formData.birth_date}
              onChange={(e) => handleChange('birth_date', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="personal_information" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.personalInformation', 'Additional Information')}
            </label>
            <textarea
              id="personal_information"
              value={formData.personal_information}
              onChange={(e) => handleChange('personal_information', e.target.value)}
              rows={3}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.personal_information))}`}
              dir={getTextDirection(getLanguage(formData.personal_information))}
              placeholder={t('nodeEditor.personalInfoPlaceholder', 'Additional personal notes...')}
            />
          </div>

          {/* Is Dead */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_dead}
                onChange={(e) => handleChange('is_dead', e.target.checked)}
                className="mr-2 rtl:mr-0 rtl:ml-2"
              />
              <span className="text-xs font-medium text-gray-500">
                {t('nodeEditor.isDeceased', 'Deceased')}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoleFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <Briefcase size={14} className="mr-1 rtl:mr-0 rtl:ml-1" />
          {t('nodeEditor.roleInformation', 'Role & Position')}
        </h3>
        <div className="space-y-3">
          {/* Role */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="role" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.role', 'Role/Position')} *
            </label>
            <input
              type="text"
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.role))}`}
              dir={getTextDirection(getLanguage(formData.role))}
              placeholder={t('nodeEditor.rolePlaceholder', 'e.g., Manager')}
            />
            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
          </div>

          {/* Department */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="department" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.department', 'Department')}
            </label>
            <input
              type="text"
              id="department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.department))}`}
              dir={getTextDirection(getLanguage(formData.department))}
              placeholder={t('nodeEditor.departmentPlaceholder', 'e.g., Engineering')}
            />
          </div>

          {/* Rank */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="rank" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.rank', 'Rank')}
            </label>
            <input
              type="text"
              id="rank"
              value={formData.rank}
              onChange={(e) => handleChange('rank', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('nodeEditor.rankPlaceholder', 'e.g., Senior')}
            />
          </div>

          {/* Role Information */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="role_information" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.roleInformation', 'Role Details')}
            </label>
            <textarea
              id="role_information"
              value={formData.role_information}
              onChange={(e) => handleChange('role_information', e.target.value)}
              rows={3}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.role_information))}`}
              dir={getTextDirection(getLanguage(formData.role_information))}
              placeholder={t('nodeEditor.roleInfoPlaceholder', 'Additional role details...')}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrganizationFields = () => (
    <div className="space-y-3">
      <div className="p-3 bg-gray-50 rounded-md">
        <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center">
          <Home size={14} className="mr-1 rtl:mr-0 rtl:ml-1" />
          {t('nodeEditor.organizationInformation', 'Organization')}
        </h3>
        <div className="space-y-3">
          {/* Organization ID */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="organization_id" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.organizationId', 'Organization ID')}
            </label>
            <input
              type="text"
              id="organization_id"
              value={formData.organization_id}
              onChange={(e) => handleChange('organization_id', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={t('nodeEditor.organizationIdPlaceholder', 'e.g., ORG-001')}
            />
          </div>

          {/* Organization Name */}
          <div className="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300">
            <label htmlFor="organization_name" className="block text-xs font-medium text-gray-500 mb-1">
              {t('nodeEditor.organizationName', 'Organization Name')}
            </label>
            <input
              type="text"
              id="organization_name"
              value={formData.organization_name}
              onChange={(e) => handleChange('organization_name', e.target.value)}
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${getFontClass(getLanguage(formData.organization_name))}`}
              dir={getTextDirection(getLanguage(formData.organization_name))}
              placeholder={t('nodeEditor.organizationNamePlaceholder', 'e.g., Acme Corp')}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "calc(100vh - 40px)" }}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                {mode === 'add'
                  ? t('nodeEditor.addNode', 'Add New Node')
                  : t('nodeEditor.editNode', 'Edit Node')
                }
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                      currentTab === tab.id
                        ? 'text-gray-800 border-b-2 border-gray-800'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 240px)" }}>
              {currentTab === 'personal' && renderPersonalFields()}
              {currentTab === 'role' && renderRoleFields()}
              {currentTab === 'organization' && renderOrganizationFields()}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {t('nodeEditor.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: THEME.buttonColor,
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = THEME.buttonHover}
                onMouseLeave={(e) => e.target.style.backgroundColor = THEME.buttonColor}
              >
                <Save size={16} />
                {t('nodeEditor.save', 'Save')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NodeEditorModal;
