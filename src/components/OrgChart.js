import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Upload, List, Home } from 'react-feather';
import FilterModal from './FilterModal';
import TreeNode from './TreeNode';
import Modal from './Modal';
import Button from './Button';
import FileUploadModal from './FileUploadModal';
import TableSelectionModal from './TableSelectionModal';
import LandingPage from './LandingPage';
import { useKeyboardShortcut } from '../Utilities/KeyboardShortcuts';
import { useOrgChart } from '../hooks/useOrgChart';
import { useOrgChartContext } from './OrgChartContext';

const OrgChart = () => {
  const {
    orgData,
    folderStructure,
    selectedTableId,
    loading,
    error,
    hasTables,
    setSelectedTableId,
    handleFileUpload,
    fetchFolderStructureData,
  } = useOrgChart();

  const {
    showLanding,
    setShowLanding,
    activeFilters,
    setActiveFilters,
    expandAll,
    setExpandAll,
  } = useOrgChartContext();

  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const handleTableSelection = useCallback(async (tableId) => {
    setSelectedTableId(tableId);
    setIsTableSelectionOpen(false);
    setShowLanding(false);
  }, [setSelectedTableId, setShowLanding]);

  const handleViewTables = useCallback(() => {
    if (hasTables) {
      setIsTableSelectionOpen(true);
      setShowLanding(false);
    } else {
      setIsUploadOpen(true);
    }
  }, [hasTables, setShowLanding]);

  const handleUpload = useCallback(() => {
    setIsUploadOpen(true);
    setShowLanding(false);
  }, [setShowLanding]);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
    setIsFilterOpen(false);
  }, [setActiveFilters]);

  const filterOrgData = useMemo(() => (node) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.some(filter => 
      node.name.toLowerCase().includes(filter.toLowerCase()) ||
      node.role.toLowerCase().includes(filter.toLowerCase())
    );
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

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-screen">
          <p className="text-red-600 text-xl mb-4">{error}</p>
          <Button onClick={fetchFolderStructureData}>Retry</Button>
        </div>
      );
    }

    if (showLanding) {
      return (
        <LandingPage
          hasTables={hasTables}
          onViewTables={handleViewTables}
          onUpload={handleUpload}
          onCreateTable={handleUpload}
        />
      );
    }

    if (loading) {
      return <div className="flex justify-center items-center h-screen text-2xl text-gray-600">Loading...</div>;
    }

    if (selectedTableId && orgData) {
      return (
        <>
          <div className="absolute top-4 left-4 z-10 flex space-x-2">
            <Button onClick={() => setShowLanding(true)} icon={Home}>
              Home
            </Button>
            <Button onClick={() => setExpandAll(true)} icon={ChevronDown}>
              Open All
            </Button>
            <Button onClick={() => setExpandAll(false)} icon={ChevronUp}>
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
                  filterNode={filterOrgData}
                />
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <div className="flex justify-center items-center h-screen">
        <Button onClick={handleViewTables} icon={List} className="mr-4">
          {hasTables ? "Select Table" : "Create New Table"}
        </Button>
        <Button onClick={handleUpload} icon={Upload}>
          Upload New Table
        </Button>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {renderContent()}
      <AnimatePresence>
        {selectedNode && (
          <Modal node={selectedNode} onClose={() => setSelectedNode(null)} />
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
        onClose={() => {
          setIsUploadOpen(false);
          if (!selectedTableId) setShowLanding(true);
        }}
        onUpload={handleFileUpload}
      />
    </div>
  );
};

export default OrgChart;