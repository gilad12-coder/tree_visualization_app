import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Briefcase, Home } from 'react-feather';
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
  mode = 'add',
  parentNode = null
}) => {
  const { t } = useTranslation();

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
    is_dead: 'alive'
  });

  const [errors, setErrors] = useState({});

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
        is_dead: nodeData.is_dead || 'alive'
      });
    } else if (mode === 'add' && parentNode) {
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
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = t('nodeEditor.nameRequired', 'Name is required');
    }

    if (!formData.role || !formData.role.trim()) {
      newErrors.role = t('nodeEditor.roleRequired', 'Role is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validate()) {
      try {
        await onSave(formData);
        onClose();
      } catch (error) {
        console.error('Error saving node:', error);
      }
    }
  };

  if (!isOpen) return null;

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
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden flex flex-col"
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

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 180px)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column - Personal & Role */}
                <div className="space-y-4">
                  {/* Personal Section */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <User size={16} className="mr-2" />
                      {t('nodeEditor.personalInformation', 'Personal Information')}
                    </h3>
                    <div className="space-y-3">
                      {/* Name */}
                      <div>
                        <label htmlFor="name" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.name', 'Full Name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.name))}`}
                          dir={getTextDirection(getLanguage(formData.name))}
                          placeholder={t('nodeEditor.namePlaceholder', 'e.g., John Doe')}
                        />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                      </div>

                      {/* Person ID */}
                      <div>
                        <label htmlFor="person_id" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.personId', 'Person ID')}
                        </label>
                        <input
                          type="text"
                          id="person_id"
                          value={formData.person_id}
                          onChange={(e) => handleChange('person_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder={t('nodeEditor.personIdPlaceholder', 'e.g., 12345')}
                        />
                      </div>

                      {/* Birth Date */}
                      <div>
                        <label htmlFor="birth_date" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.birthDate', 'Birth Date')}
                        </label>
                        <input
                          type="date"
                          id="birth_date"
                          value={formData.birth_date}
                          onChange={(e) => handleChange('birth_date', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                        />
                      </div>

                      {/* Status - Radio Buttons */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          {t('nodeEditor.status', 'Status')}
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="is_dead"
                              value="alive"
                              checked={formData.is_dead === 'alive'}
                              onChange={(e) => handleChange('is_dead', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              {t('nodeEditor.alive', 'Alive')}
                            </span>
                          </label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="radio"
                              name="is_dead"
                              value="dead"
                              checked={formData.is_dead === 'dead'}
                              onChange={(e) => handleChange('is_dead', e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              {t('nodeEditor.deceased', 'Deceased')}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Personal Information */}
                      <div>
                        <label htmlFor="personal_information" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.additionalInfo', 'Additional Notes')}
                        </label>
                        <textarea
                          id="personal_information"
                          value={formData.personal_information}
                          onChange={(e) => handleChange('personal_information', e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.personal_information))}`}
                          dir={getTextDirection(getLanguage(formData.personal_information))}
                          placeholder={t('nodeEditor.personalInfoPlaceholder', 'Additional personal notes...')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Role Section */}
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Briefcase size={16} className="mr-2" />
                      {t('nodeEditor.roleInformation', 'Role & Position')}
                    </h3>
                    <div className="space-y-3">
                      {/* Role */}
                      <div>
                        <label htmlFor="role" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.role', 'Role/Position')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="role"
                          value={formData.role}
                          onChange={(e) => handleChange('role', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.role))}`}
                          dir={getTextDirection(getLanguage(formData.role))}
                          placeholder={t('nodeEditor.rolePlaceholder', 'e.g., Manager')}
                        />
                        {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
                      </div>

                      {/* Department */}
                      <div>
                        <label htmlFor="department" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.department', 'Department')}
                        </label>
                        <input
                          type="text"
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleChange('department', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.department))}`}
                          dir={getTextDirection(getLanguage(formData.department))}
                          placeholder={t('nodeEditor.departmentPlaceholder', 'e.g., Engineering')}
                        />
                      </div>

                      {/* Rank */}
                      <div>
                        <label htmlFor="rank" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.rank', 'Rank')}
                        </label>
                        <input
                          type="text"
                          id="rank"
                          value={formData.rank}
                          onChange={(e) => handleChange('rank', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder={t('nodeEditor.rankPlaceholder', 'e.g., Senior')}
                        />
                      </div>

                      {/* Role Information */}
                      <div>
                        <label htmlFor="role_information" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.roleDetails', 'Role Details')}
                        </label>
                        <textarea
                          id="role_information"
                          value={formData.role_information}
                          onChange={(e) => handleChange('role_information', e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.role_information))}`}
                          dir={getTextDirection(getLanguage(formData.role_information))}
                          placeholder={t('nodeEditor.roleInfoPlaceholder', 'Additional role details...')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Organization */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-md">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Home size={16} className="mr-2" />
                      {t('nodeEditor.organizationInformation', 'Organization')}
                    </h3>
                    <div className="space-y-3">
                      {/* Organization ID */}
                      <div>
                        <label htmlFor="organization_id" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.organizationId', 'Organization ID')}
                        </label>
                        <input
                          type="text"
                          id="organization_id"
                          value={formData.organization_id}
                          onChange={(e) => handleChange('organization_id', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                          placeholder={t('nodeEditor.organizationIdPlaceholder', 'e.g., ORG-001')}
                        />
                      </div>

                      {/* Organization Name */}
                      <div>
                        <label htmlFor="organization_name" className="block text-xs font-medium text-gray-600 mb-1">
                          {t('nodeEditor.organizationName', 'Organization Name')}
                        </label>
                        <input
                          type="text"
                          id="organization_name"
                          value={formData.organization_name}
                          onChange={(e) => handleChange('organization_name', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent ${getFontClass(getLanguage(formData.organization_name))}`}
                          dir={getTextDirection(getLanguage(formData.organization_name))}
                          placeholder={t('nodeEditor.organizationNamePlaceholder', 'e.g., Acme Corp')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
