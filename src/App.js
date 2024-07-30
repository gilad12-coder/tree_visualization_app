import React, { useState } from 'react';
import { OrgChartProvider } from './components/OrgChartContext';
import OrgChart from './components/OrgChart';
import LandingPage from './components/LandingPage';
import './App.css';
import './styles/fonts.css';  // Add this line to import the fonts.css file

function App() {
  const [dbSelected, setDbSelected] = useState(false);
  const [dbPath, setDbPath] = useState(null);
  const [initialTableId, setInitialTableId] = useState(null);

  const handleDatabaseReady = (path, tableId) => {
    setDbPath(path);
    setInitialTableId(tableId);
    setDbSelected(true);
  };

  const handleReturnToLanding = () => {
    setDbSelected(false);
    setDbPath(null);
    setInitialTableId(null);
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
            onReturnToLanding={handleReturnToLanding}
          />
        )}
      </OrgChartProvider>
    </div>
  );
}

export default App;