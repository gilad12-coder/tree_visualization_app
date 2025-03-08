import React, { createContext, useState, useContext, useEffect } from 'react';

const OrgChartContext = createContext();

export const useOrgChartContext = () => useContext(OrgChartContext);

export const OrgChartProvider = ({ children }) => {
  const [showLanding, setShowLanding] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [expandAll, setExpandAll] = useState(false);
  const [nodeOrder, setNodeOrder] = useState({});
  const [selectedSwapNode, setSelectedSwapNode] = useState(null);

  useEffect(() => {
    const savedOrder = localStorage.getItem('orgChartNodeOrder');
    if (savedOrder) {
      setNodeOrder(JSON.parse(savedOrder));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('orgChartNodeOrder', JSON.stringify(nodeOrder));
  }, [nodeOrder]);

  const handleSelectForSwap = (node) => setSelectedSwapNode(node);
  const handleCancelSwap = () => setSelectedSwapNode(null);

  const handleSwapNodes = (parentId, node1Id, node2Id) => {
    setNodeOrder(prevOrder => {
      const currentOrder = prevOrder[parentId] || [];
      const index1 = currentOrder.indexOf(node1Id);
      const index2 = currentOrder.indexOf(node2Id);
      const newOrder = [...currentOrder];

      if (index1 === -1) newOrder.push(node1Id);
      if (index2 === -1) newOrder.push(node2Id);

      const updatedIndex1 = newOrder.indexOf(node1Id);
      const updatedIndex2 = newOrder.indexOf(node2Id);
      [newOrder[updatedIndex1], newOrder[updatedIndex2]] = [newOrder[updatedIndex2], newOrder[updatedIndex1]];

      setSelectedSwapNode(null);
      return { ...prevOrder, [parentId]: newOrder };
    });
  };

  const handleReorderNodes = (parentId, nodeId, direction) => {
    setNodeOrder(prevOrder => {
      const currentOrder = prevOrder[parentId] || [];
      const currentIndex = currentOrder.indexOf(nodeId);

      if (currentIndex === -1) {
        return { ...prevOrder, [parentId]: [...currentOrder, nodeId] };
      }

      const newIndex = direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(currentOrder.length - 1, currentIndex + 1);
      if (newIndex === currentIndex) return prevOrder;

      const newOrder = [...currentOrder];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, nodeId);

      return { ...prevOrder, [parentId]: newOrder };
    });
  };

  const value = {
    showLanding,
    setShowLanding,
    activeFilters,
    setActiveFilters,
    expandAll,
    setExpandAll,
    nodeOrder,
    setNodeOrder,
    handleReorderNodes,
    selectedSwapNode,
    handleSelectForSwap,
    handleSwapNodes,
    handleCancelSwap
  };

  return (
    <OrgChartContext.Provider value={value}>
      {children}
    </OrgChartContext.Provider>
  );
};

export default OrgChartContext;