import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import TreeNode from '../TreeBuilder/TreeNode';

const TreeBuilder = ({ onTreeCreated }) => {
  const { t } = useTranslation();
  const [treeName, setTreeName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [nodes, setNodes] = useState({
    root: { id: 'root', name: 'Root', children: [] },
  });

  const handleAddChild = useCallback((parentId) => {
    const newNodeId = `node-${Date.now()}`;
    const newNode = { id: newNodeId, name: '', children: [] };

    setNodes((prevNodes) => {
      const newNodes = { ...prevNodes, [newNodeId]: newNode };
      const parentNode = newNodes[parentId];
      newNodes[parentId] = {
        ...parentNode,
        children: [...parentNode.children, newNodeId],
      };
      return newNodes;
    });
  }, []);

  const handleUpdateNode = useCallback((nodeId, updatedData) => {
    setNodes((prevNodes) => ({
      ...prevNodes,
      [nodeId]: { ...prevNodes[nodeId], ...updatedData },
    }));
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    setNodes((prevNodes) => {
      const newNodes = { ...prevNodes };
      delete newNodes[nodeId];

      // Also remove the node from its parent's children array
      for (const key in newNodes) {
        newNodes[key].children = newNodes[key].children.filter(
          (childId) => childId !== nodeId
        );
      }

      return newNodes;
    });
  }, []);

  const renderTree = (nodeId) => {
    const node = nodes[nodeId];
    if (!node) return null;

    return (
      <div key={node.id} className="ml-8">
        <TreeNode
          node={node}
          onAddChild={handleAddChild}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
        />
        <div className="ml-8">
          {node.children.map((childId) => renderTree(childId))}
        </div>
      </div>
    );
  };

  const handleCreateTree = () => {
    if (treeName.trim() === '') {
      alert(t('treeBuilder.treeNameRequired'));
      return;
    }
    if (folderName.trim() === '') {
      alert(t('treeBuilder.folderNameRequired'));
      return;
    }
    // Pass the tree name, nodes, and folder name to the parent component.
    onTreeCreated(treeName, nodes, folderName);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6 text-center">{t('treeBuilder.createNewTree')}</h2>
        <div className="mb-4">
          <label htmlFor="folderName" className="block text-sm font-medium text-gray-700">
            {t('treeBuilder.folderName')}
          </label>
          <input
            type="text"
            id="folderName"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder={t('treeBuilder.folderNamePlaceholder')}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="treeName" className="block text-sm font-medium text-gray-700">
            {t('treeBuilder.treeName')}
          </label>
          <input
            type="text"
            id="treeName"
            value={treeName}
            onChange={(e) => setTreeName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="border-t border-gray-200 mt-6 pt-6">
          {renderTree('root')}
        </div>
        <button
          onClick={handleCreateTree}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-6"
        >
          {t('treeBuilder.createTree')}
        </button>
      </div>
    </div>
  );
};

export default TreeBuilder;