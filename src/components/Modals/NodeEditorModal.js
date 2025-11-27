import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Briefcase, Building, Calendar, Info, Hash } from 'react-feather';
import { useTranslation } from 'react-i18next';

const NodeEditorModal = ({
  isOpen,
  onClose,
  onSave,
  nodeData = null,
  mode = 'add', // 'add' or 'edit'
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
    is_dead: false
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (nodeData && mode === 'edit') {
      setFormData({
        name: nodeData.name || '',
        role: nodeData.role || '',
        department: nodeData.department || parentNode?.department || '',
        rank: nodeData.rank || '',
        person_id: nodeData.person_id || '',
        birth_date: nodeData.birth_date || '',
        personal_information: nodeData.personal_information || '',
        organization_id: nodeData.organization_id || '',
        organization_name: nodeData.organization_name || parentNode?.organization_name || '',
        role_information: nodeData.role_information || '',
        is_dead: nodeData.is_dead || false
      });
    } else if (mode === 'add' && parentNode) {
      // Pre-fill department and organization from parent
      setFormData(prev => ({
        ...prev,
        department: parentNode.department || '',
        organization_name: parentNode.organization_name || ''
      }));
    }
  }, [nodeData, mode, parentNode, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('nodeEditor.errors.nameRequired', 'Name is required');
    }

    if (!formData.role.trim()) {
      newErrors.role = t('nodeEditor.errors.roleRequired', 'Role is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
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
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">
              {mode === 'add'
                ? t('nodeEditor.addNode', 'Add New Node')
                : t('nodeEditor.editNode', 'Edit Node')}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name - Required */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <User size={16} className="mr-2" />
                  {t('nodeEditor.name', 'Name')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('nodeEditor.namePlaceholder', 'Enter full name')}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              {/* Role - Required */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Briefcase size={16} className="mr-2" />
                  {t('nodeEditor.role', 'Role')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.role ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={t('nodeEditor.rolePlaceholder', 'e.g., Software Engineer')}
                />
                {errors.role && (
                  <p className="text-red-500 text-sm mt-1">{errors.role}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="mr-2" />
                  {t('nodeEditor.department', 'Department')}
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.departmentPlaceholder', 'e.g., Engineering')}
                />
              </div>

              {/* Organization Name */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Building size={16} className="mr-2" />
                  {t('nodeEditor.organizationName', 'Organization Name')}
                </label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => handleChange('organization_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.organizationNamePlaceholder', 'e.g., Tech Division')}
                />
              </div>

              {/* Person ID */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Hash size={16} className="mr-2" />
                  {t('nodeEditor.personId', 'Person ID')}
                </label>
                <input
                  type="text"
                  value={formData.person_id}
                  onChange={(e) => handleChange('person_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.personIdPlaceholder', 'e.g., EMP001')}
                />
              </div>

              {/* Organization ID */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Hash size={16} className="mr-2" />
                  {t('nodeEditor.organizationId', 'Organization ID')}
                </label>
                <input
                  type="text"
                  value={formData.organization_id}
                  onChange={(e) => handleChange('organization_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.organizationIdPlaceholder', 'e.g., ORG001')}
                />
              </div>

              {/* Rank */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Info size={16} className="mr-2" />
                  {t('nodeEditor.rank', 'Rank')}
                </label>
                <input
                  type="text"
                  value={formData.rank}
                  onChange={(e) => handleChange('rank', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.rankPlaceholder', 'e.g., Senior')}
                />
              </div>

              {/* Birth Date */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Calendar size={16} className="mr-2" />
                  {t('nodeEditor.birthDate', 'Birth Date')}
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Personal Information */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Info size={16} className="mr-2" />
                  {t('nodeEditor.personalInformation', 'Personal Information')}
                </label>
                <textarea
                  value={formData.personal_information}
                  onChange={(e) => handleChange('personal_information', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.personalInformationPlaceholder', 'Additional personal details...')}
                />
              </div>

              {/* Role Information */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <Info size={16} className="mr-2" />
                  {t('nodeEditor.roleInformation', 'Role Information')}
                </label>
                <textarea
                  value={formData.role_information}
                  onChange={(e) => handleChange('role_information', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('nodeEditor.roleInformationPlaceholder', 'Role-specific details...')}
                />
              </div>

              {/* Is Dead */}
              <div className="md:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_dead}
                    onChange={(e) => handleChange('is_dead', e.target.checked)}
                    className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  {t('nodeEditor.isDead', 'Deceased')}
                </label>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {t('nodeEditor.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={18} />
              {mode === 'add'
                ? t('nodeEditor.addNode', 'Add Node')
                : t('nodeEditor.saveChanges', 'Save Changes')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NodeEditorModal;
