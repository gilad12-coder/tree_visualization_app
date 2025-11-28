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

    // Initialize node order for this node's children if they exist
    if (node.children && node.children.length > 0) {
      const parentId = node.hierarchical_structure;
      const childIds = node.children.map(child => child.hierarchical_structure);

      setNodeOrder(prevOrder => {
        // Only initialize if this parent's order hasn't been set yet
        if (!prevOrder[parentId] || prevOrder[parentId].length === 0) {
          console.log(`Initializing node order for parent ${parentId}:`, childIds);
          return {
            ...prevOrder,
            [parentId]: childIds
          };
        }
        return prevOrder;
      });
    }
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
    console.log('=== SWAP START ===');
    console.log(`Parent: ${parentId}`);
    console.log(`Node1: ${node1Id}`);
    console.log(`Node2: ${node2Id}`);

    // Validate inputs
    if (!parentId || !node1Id || !node2Id) {
      console.error('ERROR: Missing required IDs');
      return;
    }

    // Prevent swapping a node with itself
    if (node1Id === node2Id) {
      console.warn('WARNING: Cannot swap node with itself');
      return;
    }

    setNodeOrder(prevOrder => {
      console.log('Previous order state:', JSON.stringify(prevOrder));

      let currentOrder = prevOrder[parentId] || [];
      console.log(`Current order for parent ${parentId}:`, currentOrder);

      const index1 = currentOrder.indexOf(node1Id);
      const index2 = currentOrder.indexOf(node2Id);
      console.log(`Indices before swap - node1: ${index1}, node2: ${index2}`);

      // If EITHER node is missing from the order, we can't swap reliably
      // This means the order hasn't been initialized yet
      if (index1 === -1 || index2 === -1) {
        console.error('ERROR: One or both nodes not found in order array!');
        console.error('This indicates the node order hasn\'t been properly initialized.');
        console.error('Cannot perform swap - order would be incorrect.');
        toast.error('Cannot swap: node order not initialized');
        return prevOrder; // Return unchanged
      }

      // Both nodes exist in the order - perform the swap
      const newOrder = [...currentOrder];
      [newOrder[index1], newOrder[index2]] = [newOrder[index2], newOrder[index1]];

      console.log('New order after swap:', newOrder);
      console.log('=== SWAP END ===');

      return { ...prevOrder, [parentId]: newOrder };
    });

    // Clear selection and show feedback
    setSelectedSwapNode(null);
    toast.success(t('chartOperations.nodesSwapped'));
  }, [t]);

  const handleSwapNodesWithRerender = useCallback((parentId, node1Id, node2Id) => {
    console.log(`Swapping nodes with rerender: Parent=${parentId}, Node1=${node1Id}, Node2=${node2Id}`);

    // Perform the swap
    handleSwapNodes(parentId, node1Id, node2Id);

    // Force a re-render by updating the swap key
    // React will automatically handle DOM updates - no manual manipulation needed
    setSwapKey(prev => prev + 1);
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
