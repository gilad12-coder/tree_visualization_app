import React, { useState } from 'react';
import { OrgChartProvider } from './components/OrgChartContext';
import OrgChart from './components/OrgChart';
import LandingPage from './components/LandingPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles/fonts.css';

function App() {
  const [dbSelected, setDbSelected] = useState(false);
  const [dbPath, setDbPath] = useState(null);
  const [initialTableId, setInitialTableId] = useState(null);
  const [initialFolderId, setInitialFolderId] = useState(null);

  const handleDatabaseReady = (path, tableId, folderId) => {
    setDbPath(path);
    setInitialTableId(tableId);
    setInitialFolderId(folderId);
    setDbSelected(true);
  };

  const handleReturnToLanding = () => {
    setDbSelected(false);
    setDbPath(null);
    setInitialTableId(null);
    setInitialFolderId(null);
  };

  return (
    <div className="App">
      <OrgChartProvider>
        {!dbSelected ? (
          <LandingPage onDatabaseReady={handleDatabaseReady} currentDbPath={dbPath} />
        ) : (
          <OrgChart 
            dbPath={dbPath}
            initialTableId={initialTableId}
            initialFolderId={initialFolderId}
            onReturnToLanding={handleReturnToLanding}
          />
        )}
      </OrgChartProvider>
      <ToastContainer />
    </div>
  );
}

export default App;