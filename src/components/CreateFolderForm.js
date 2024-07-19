// src/components/CreateFolderForm.js
import React, { useState } from 'react';
import Button from './Button';

const CreateFolderForm = ({ onSubmit, onCancel }) => {
  const [folderName, setFolderName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(folderName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="folderName" className="block text-sm font-medium text-gray-700">
          Folder Name
        </label>
        <input
          type="text"
          id="folderName"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button type="submit">
          Create Folder
        </Button>
      </div>
    </form>
  );
};

export default CreateFolderForm;