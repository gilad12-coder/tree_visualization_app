import React from 'react';
import { useTranslation } from 'react-i18next';

const TreeNode = ({ node, onAddChild, onUpdate, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center mb-4">
      <div className="bg-white p-4 rounded-lg shadow-md flex-grow">
        <input
          type="text"
          value={node.name}
          onChange={(e) => onUpdate(node.id, { name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.nodeName')}
        />
        <input
          type="text"
          value={node.role}
          onChange={(e) => onUpdate(node.id, { role: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.role')}
        />
        <input
          type="text"
          value={node.department}
          onChange={(e) => onUpdate(node.id, { department: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.department')}
        />
        <input
          type="text"
          value={node.rank}
          onChange={(e) => onUpdate(node.id, { rank: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.rank')}
        />
        <input
          type="text"
          value={node.person_id}
          onChange={(e) => onUpdate(node.id, { person_id: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.personId')}
        />
        <input
          type="date"
          value={node.birth_date || ''}
          onChange={(e) => onUpdate(node.id, { birth_date: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.birthDate')}
        />
        <input
          type="text"
          value={node.personal_information}
          onChange={(e) => onUpdate(node.id, { personal_information: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.personalInformation')}
        />
        <input
          type="text"
          value={node.organization_id}
          onChange={(e) => onUpdate(node.id, { organization_id: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.organizationId')}
        />
        <input
          type="text"
          value={node.organization_name}
          onChange={(e) => onUpdate(node.id, { organization_name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.organizationName')}
        />
        <input
          type="text"
          value={node.role_information}
          onChange={(e) => onUpdate(node.id, { role_information: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2"
          placeholder={t('treeBuilder.roleInformation')}
        />
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={node.is_dead}
            onChange={(e) => onUpdate(node.id, { is_dead: e.target.checked })}
            className="mr-2"
          />
          <label>{t('treeBuilder.isDead')}</label>
        </div>
      </div>
      <div className="flex items-center ml-4">
        <button
          onClick={() => onAddChild(node.id)}
          className="bg-green-500 text-white px-3 py-1 rounded-md mr-2"
        >
          {t('treeBuilder.addChild')}
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="bg-red-500 text-white px-3 py-1 rounded-md"
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
};

export default TreeNode;