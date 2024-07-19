import { useState, useRef, useEffect, useCallback } from 'react';

const useDragAndZoom = (initialTransform = { x: 0, y: 0, scale: 1 }) => {
  const [transform, setTransform] = useState(initialTransform);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const calculateZoomLimits = () => {
    if (chartRef.current && dragRef.current) {
      const chartRect = chartRef.current.getBoundingClientRect();
      const containerRect = dragRef.current.getBoundingClientRect();

      const scaleX = containerRect.width / chartRect.width;
      const scaleY = containerRect.height / chartRect.height;

      const minScale = Math.min(scaleX, scaleY) * 0.5;
      const maxScale = 3;

      return { minScale, maxScale };
    }
    return { minScale: 0.1, maxScale: 3 };
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform((prev) => ({
        ...prev,
        x: prev.x + e.movementX / prev.scale,
        y: prev.y + e.movementY / prev.scale,
      }));
    }
  }, [isDragging]);

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const { minScale, maxScale } = calculateZoomLimits();
    const scaleFactor = 1 - e.deltaY * 0.001;

    setTransform((prev) => {
      const newScale = Math.max(minScale, Math.min(maxScale, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;

      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);

      return { x: newX, y: newY, scale: newScale };
    });
  };

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
  }, [isDragging, handleMouseMove]);

  return {
    transform,
    isDragging,
    dragRef,
    chartRef,
    handleMouseDown,
    handleWheel,
  };
};

export default useDragAndZoom;
