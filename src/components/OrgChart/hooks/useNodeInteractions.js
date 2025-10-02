import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const useNodeInteractions = (
  selectedFolderId,
  selectedTableId
) => {
  const { t } = useTranslation();
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [renderedNodes, setRenderedNodes] = useState([]);
  const [filteredOrgId, setFilteredOrgId] = useState(null);
  const [originalOrgData, setOriginalOrgData] = useState(null);
  const [selectedSwapNode, setSelectedSwapNode] = useState(null);
  const [swapKey, setSwapKey] = useState(0);
  const [nodeOrder, setNodeOrder] = useState({});

  const handleNodeClick = useCallback((node, isOrgFilter = false, filteredOrgData, organizationModeData) => {
    if (isOrgFilter && node.isOrgNode) {
      if (filteredOrgId === node.hierarchical_structure) {
        setFilteredOrgId(null);
        if (originalOrgData) {
          return originalOrgData;
        }
        toast.info(t('chartOperations.showingAllOrganizations'));
      } else {
        if (!originalOrgData) {
          setOriginalOrgData(filteredOrgData);
        }
        setFilteredOrgId(node.hierarchical_structure);
        const filterOrgOnly = (rootNode) => {
          if (!rootNode) return null;
          if (rootNode.hierarchical_structure === node.hierarchical_structure) {
            return { ...rootNode };
          }
          if (rootNode.children && rootNode.children.length > 0) {
            const filteredChildren = rootNode.children
              .map(filterOrgOnly)
              .filter(Boolean);
            if (filteredChildren.length > 0) {
              return {
                ...rootNode,
                children: filteredChildren
              };
            }
          }
          return null;
        };
        
        const rootData = organizationModeData || originalOrgData || filteredOrgData;
        const filteredData = filterOrgOnly(rootData);
        
        if (filteredData) {
          toast.info(t('chartOperations.filteredToOrg', { orgName: node.name }));
          return filteredData; // Return data to update in parent
        } else {
          toast.error(t('chartOperations.couldNotFilterOrg'));
        }
      }
    } else {
      setSelectedNode({ ...node, folderId: selectedFolderId, tableId: selectedTableId });
    }
    return null; // No data update needed
  }, [
    filteredOrgId,
    originalOrgData,
    selectedFolderId,
    selectedTableId,
    t
  ]);

  const handleNodeRendered = useCallback((node) => {
    if (!node || !node.hierarchical_structure) return;
    
    setRenderedNodes(prev => {
      // Check if this node is already tracked
      const existing = prev.find(n => n.hierarchical_structure === node.hierarchical_structure);
      if (!existing) {
        // Add the node to the rendered nodes list
        return [...prev, node];
      }
      
      // If the node exists but has different properties (might be updated), replace it
      if (JSON.stringify(existing) !== JSON.stringify(node)) {
        return prev.map(n => 
          n.hierarchical_structure === node.hierarchical_structure ? node : n
        );
      }
      
      return prev;
    });
  }, []);

  const handleNodeUnrendered = useCallback((nodeStructure) => {
    setRenderedNodes(prev => prev.filter(node => node.hierarchical_structure !== nodeStructure));
  }, []);

  const handleSelectForSwap = useCallback((node) => {
    setSelectedSwapNode(node);
    toast.info(t('chartOperations.selectedForSwap', { nodeName: node.name || 'Node' }));
  }, [t]);

  const handleCancelSwap = useCallback(() => {
    setSelectedSwapNode(null);
    toast.info(t('chartOperations.swapCancelled'));
  }, [t]);

  const handleSwapNodes = useCallback((parentId, node1Id, node2Id) => {
    console.log(`Swapping nodes: Parent=${parentId}, Node1=${node1Id}, Node2=${node2Id}`);
    
    if (!parentId || !node1Id || !node2Id) {
      console.error('Missing required IDs for node swapping');
      return;
    }
    
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
    
    // Show feedback to the user
    toast.success(t('chartOperations.nodesSwapped'));
  }, [t]);

  const handleSwapNodesWithRerender = useCallback((parentId, node1Id, node2Id) => {
    console.log(`Swapping nodes with rerender: Parent=${parentId}, Node1=${node1Id}, Node2=${node2Id}`);
    
    // First handle the data structure update
    handleSwapNodes(parentId, node1Id, node2Id);
    
    // Force a complete re-render by updating the swap key
    setSwapKey(prev => prev + 1);
    
    // Update the DOM to reflect the changes after a short delay
    setTimeout(() => {
      console.log('Updating DOM connections after swap');
      // Try to find the parent node in the DOM
      const parentElement = document.getElementById(`node-${parentId}`);
      if (parentElement) {
        console.log(`Found parent element for node ${parentId}`);
        
        // Find all child nodes to verify they're in the correct order
        const childElements = parentElement.querySelectorAll('[id^="node-"]');
        if (childElements.length > 0) {
          console.log('Child nodes found:', childElements.length);
          
          // Force a repaint of all connection lines
          const connections = document.querySelectorAll('.node-connection, .bg-gray-400');
          connections.forEach(conn => {
            conn.style.opacity = '0.99';
            setTimeout(() => {
              conn.style.opacity = '1';
            }, 10);
          });
        } else {
          console.warn('No child elements found for parent node');
        }
      } else {
        console.warn(`Could not find parent element node-${parentId}`);
      }
    }, 100);
  }, [handleSwapNodes]);

  const handleReorderNodes = useCallback((parentId, nodeId, direction) => {
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
    
    // Force a re-render
    setSwapKey(prev => prev + 1);
    
    // Provide feedback to the user
    toast.success(t('chartOperations.nodeMoved', { direction }));
  }, [t]);

  const handleBackgroundClick = useCallback((e) => {
    if (e.target === e.currentTarget && selectedSwapNode) {
      handleCancelSwap();
    }
  }, [selectedSwapNode, handleCancelSwap]);

  return {
    selectedNode,
    setSelectedNode,
    highlightedNodes,
    setHighlightedNodes,
    renderedNodes,
    setRenderedNodes,
    filteredOrgId,
    setFilteredOrgId,
    originalOrgData,
    setOriginalOrgData,
    selectedSwapNode,
    setSelectedSwapNode,
    swapKey,
    setSwapKey,
    nodeOrder,
    setNodeOrder,
    handleNodeClick,
    handleNodeRendered,
    handleNodeUnrendered,
    handleSelectForSwap,
    handleCancelSwap,
    handleSwapNodes,
    handleSwapNodesWithRerender,
    handleReorderNodes,
    handleBackgroundClick
  };
};

export default useNodeInteractions;
