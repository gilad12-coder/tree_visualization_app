import React, { createContext, useState, useContext, useEffect } from 'react';

const OrgChartContext = createContext();

export const useOrgChartContext = () => useContext(OrgChartContext);

export const OrgChartProvider = ({ children }) => {
  const [showLanding, setShowLanding] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [expandAll, setExpandAll] = useState(false);
  const [nodeOrder, setNodeOrder] = useState({});
  const [selectedSwapNode, setSelectedSwapNode] = useState(null);

  // Load saved node order from localStorage on component mount
  useEffect(() => {
    try {
      const savedOrder = localStorage.getItem('orgChartNodeOrder');
      if (savedOrder) {
        setNodeOrder(JSON.parse(savedOrder));
      }
    } catch (error) {
      console.error('Error loading node order from localStorage:', error);
    }
  }, []);

  // Save node order to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('orgChartNodeOrder', JSON.stringify(nodeOrder));
    } catch (error) {
      console.error('Error saving node order to localStorage:', error);
    }
  }, [nodeOrder]);

  // Handle selecting a node for swapping
  const handleSelectForSwap = (node) => {
    setSelectedSwapNode(node);
  };

  // Cancel swap operation
  const handleCancelSwap = () => {
    setSelectedSwapNode(null);
  };

  // Handle swapping two nodes
  const handleSwapNodes = (parentId, node1Id, node2Id) => {
    setNodeOrder(prevOrder => {
      // Get the current order for this parent
      const currentOrder = prevOrder[parentId] || [];
      
      // Find the indices of both nodes
      const index1 = currentOrder.indexOf(node1Id);
      const index2 = currentOrder.indexOf(node2Id);
      
      // If either node isn't in the order yet, initialize properly
      if (index1 === -1 || index2 === -1) {
        // If we don't have an order for this parent yet, we need to initialize it
        // with all children of that parent, which we might not have access to here.
        // For now, we'll handle the case where at least one of the nodes is already in the order.
        
        if (index1 === -1 && index2 === -1) {
          // If neither node is in the order, create a new order with just these two nodes
          return {
            ...prevOrder,
            [parentId]: [node1Id, node2Id]
          };
        } else if (index1 === -1) {
          // node1 is not in the order but node2 is
          const newOrder = [...currentOrder];
          // Insert node1 at node2's position
          newOrder.splice(index2, 0, node1Id);
          return {
            ...prevOrder,
            [parentId]: newOrder
          };
        } else {
          // node2 is not in the order but node1 is
          const newOrder = [...currentOrder];
          // Insert node2 at node1's position
          newOrder.splice(index1, 0, node2Id);
          return {
            ...prevOrder,
            [parentId]: newOrder
          };
        }
      }
      
      // Create a new array with the nodes swapped
      const newOrder = [...currentOrder];
      newOrder[index1] = node2Id;
      newOrder[index2] = node1Id;
      
      // Clear the selected node after swapping
      setSelectedSwapNode(null);
      
      return {
        ...prevOrder,
        [parentId]: newOrder
      };
    });
  };

  // Legacy reordering function (kept for backward compatibility)
  const handleReorderNodes = (parentId, nodeId, direction) => {
    setNodeOrder(prevOrder => {
      // Get the current order for this parent
      const currentOrder = prevOrder[parentId] || [];
      
      // Find the current index of the node
      const currentIndex = currentOrder.indexOf(nodeId);
      
      // If the node isn't in the order yet, initialize
      if (currentIndex === -1) {
        return {
          ...prevOrder,
          [parentId]: [...currentOrder, nodeId]
        };
      }
      
      // Calculate the new index based on direction
      const newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(currentOrder.length - 1, currentIndex + 1);
      
      // Don't update if no change
      if (newIndex === currentIndex) return prevOrder;
      
      // Create a new array with the node moved to the new position
      const newOrder = [...currentOrder];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, nodeId);
      
      return {
        ...prevOrder,
        [parentId]: newOrder
      };
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