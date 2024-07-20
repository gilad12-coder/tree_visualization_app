import React from 'react';
import { OrgChartProvider } from './components/OrgChartContext';
import OrgChart from './components/OrgChart';
import './App.css';

function App() {
  return (
    <div className="App">
      <OrgChartProvider>
        <OrgChart />
      </OrgChartProvider>
    </div>
  );
}

export default App;