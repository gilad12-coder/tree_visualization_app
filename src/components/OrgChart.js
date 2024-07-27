import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Upload, List } from 'react-feather';
import axios from 'axios';
import FilterModal from './FilterModal';
import TreeNode from './TreeNode';
import EnhancedNodeCard from './EnhancedNodeCard';
import Button from './Button';
import FileUploadModal from './FileUploadModal';
import TableSelectionModal from './TableSelectionModal';
import { useKeyboardShortcut } from '../Utilities/KeyboardShortcuts';
import { useOrgChartContext } from './OrgChartContext';

const API_BASE_URL = 'http://localhost:5000';

const OrgChart = ({ 
  dbPath = null, 
  initialTableId = null,
  initialFolderId = null
}) => {
  const {
    activeFilters,
    setActiveFilters,
  } = useOrgChartContext();

  const [orgData, setOrgData] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;

    setLoading(true);
    setError(null);

    try {
      const [folderResponse, orgDataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/folder_structure`, { params: { db_path: dbPath } }),
        axios.get(`${API_BASE_URL}/org-data`, { params: { table_id: selectedTableId, db_path: dbPath } })
      ]);

      setFolderStructure(folderResponse.data);
      setOrgData(orgDataResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dbPath, selectedTableId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (uploadedTableId, uploadedFolderId, folderName, fileName, uploadDate) => {
    console.log('File uploaded:', { uploadedTableId, uploadedFolderId, folderName, fileName, uploadDate });
    setSelectedTableId(uploadedTableId);
    setSelectedFolderId(uploadedFolderId);
    await fetchData();
    setIsUploadOpen(false);
  };

  const handleTableSelection = useCallback(async (tableId, folderId) => {
    console.log('Table selected:', { tableId, folderId });
    setSelectedTableId(tableId);
    setSelectedFolderId(folderId);
    setIsTableSelectionOpen(false);
    await fetchData();
  }, [fetchData]);

  const handleUpload = useCallback(() => {
    console.log('Upload clicked');
    setIsUploadOpen(true);
  }, []);

  const handleNodeClick = useCallback((node) => {
    console.log('Node clicked:', node);
    setSelectedNode(prevNode => ({
      ...node,
      folderId: selectedFolderId,
      tableId: selectedTableId
    }));
  }, [selectedFolderId, selectedTableId]);

  const handleFilterChange = useCallback((filters) => {
    console.log('Filters changed:', filters);
    setActiveFilters(filters);
    setIsFilterOpen(false);
  }, [setActiveFilters]);

  const filterOrgData = useCallback((node) => {
    const matchesFilter = (n) => {
      if (activeFilters.length === 0) return true;
      return activeFilters.some(filter => 
        n.name.toLowerCase().includes(filter.toLowerCase()) ||
        n.role.toLowerCase().includes(filter.toLowerCase())
      );
    };

    const hasMatchingDescendant = (n) => {
      if (matchesFilter(n)) return true;
      if (n.children) {
        return n.children.some(hasMatchingDescendant);
      }
      return false;
    };

    return hasMatchingDescendant(node);
  }, [activeFilters]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX / prev.scale,
        y: prev.y + e.movementY / prev.scale
      }));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform(prev => {
      const newScale = Math.max(0.1, Math.min(3, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;
      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const toggleFilterModal = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);

  useKeyboardShortcut('f', true, toggleFilterModal);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  }, []);

  console.log('Render state:', { loading, error, selectedTableId, orgData, folderStructure });

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center items-center h-screen text-2xl text-gray-600"
      >
        Loading...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-red-600 text-xl mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </motion.div>
    );
  }

  if (!dbPath || !selectedTableId || !orgData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-xl mb-4">No data available. Please upload a file or select a table.</p>
        <Button onClick={handleUpload} icon={Upload} className="mb-4">
          Upload File
        </Button>
        <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>
          Select Table
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <div className="absolute top-4 left-4 z-10 flex space-x-2">
          <Button onClick={handleExpandAll} icon={ChevronDown}>
            Open All
          </Button>
          <Button onClick={handleCollapseAll} icon={ChevronUp}>
            Collapse All
          </Button>
          <Button onClick={toggleFilterModal} icon={Filter}>
            Filter (Ctrl+F)
          </Button>
          <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>
            Change Table
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} icon={Upload}>
            Upload New Table
          </Button>
        </div>
        <div
          ref={dragRef}
          className="w-full h-full cursor-move"
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          style={{ overflow: 'hidden' }}
        >
          <div
            ref={chartRef}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              transformOrigin: '0 0'
            }}
          >
            <div className="p-8 pt-20">
              <TreeNode 
                node={orgData} 
                onNodeClick={handleNodeClick} 
                expandAll={expandAll}
                collapseAll={collapseAll}
                filterNode={filterOrgData}
                folderId={selectedFolderId}
                tableId={selectedTableId}
              />
            </div>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {selectedNode && (
          <EnhancedNodeCard
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            folderId={selectedFolderId}
            tableId={selectedTableId}
          />
        )}
      </AnimatePresence>
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={handleFilterChange}
        activeFilters={activeFilters}
        orgData={orgData}
      />
      <TableSelectionModal
        isOpen={isTableSelectionOpen}
        onClose={() => setIsTableSelectionOpen(false)}
        onSelectTable={handleTableSelection}
        folderStructure={folderStructure}
      />
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleFileUpload}
        dbPath={dbPath}
      />
    </>
  );
};

export default OrgChart;