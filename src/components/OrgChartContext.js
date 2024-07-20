import React, { createContext, useState, useContext } from 'react';

const OrgChartContext = createContext();

export const useOrgChartContext = () => useContext(OrgChartContext);

export const OrgChartProvider = ({ children }) => {
  const [showLanding, setShowLanding] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [expandAll, setExpandAll] = useState(false);

  const value = {
    showLanding,
    setShowLanding,
    activeFilters,
    setActiveFilters,
    expandAll,
    setExpandAll,
  };

  return (
    <OrgChartContext.Provider value={value}>
      {children}
    </OrgChartContext.Provider>
  );
};