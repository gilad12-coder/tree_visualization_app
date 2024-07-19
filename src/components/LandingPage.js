// src/components/LandingPage.js
import React, { useState } from 'react';
import { Folder, File, Plus, Upload } from 'react-feather';
import Button from './Button';

const LandingPage = ({ folderStructure, onSelectTable, onCreateFolder, onUploadFile }) => {
  const [currentFolder, setCurrentFolder] = useState(null);

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder);
  };

  const handleBackClick = () => {
    setCurrentFolder(null);
  };

  const renderContent = () => {
    const items = currentFolder ? currentFolder.subfolders.concat(currentFolder.tables) : folderStructure;

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center"
            onClick={() => item.subfolders ? handleFolderClick(item) : onSelectTable(item.id)}
          >
            {item.subfolders ? (
              <Folder className="text-yellow-500 mb-2" size={40} />
            ) : (
              <File className="text-blue-500 mb-2" size={40} />
            )}
            <span className="text-center text-sm">{item.name}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-800">Welcome to OrgChart Visualizer</h1>
        
        <div className="mb-8 flex space-x-4">
          <Button onClick={onCreateFolder} icon={Plus}>
            New Folder
          </Button>
          <Button onClick={onUploadFile} icon={Upload}>
            Upload Table
          </Button>
        </div>

        {currentFolder && (
          <button
            onClick={handleBackClick}
            className="mb-4 text-blue-500 hover:text-blue-600 flex items-center"
          >
            ← Back to {currentFolder.parent ? currentFolder.parent.name : 'Root'}
          </button>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            {currentFolder ? currentFolder.name : 'Root'}
          </h2>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;