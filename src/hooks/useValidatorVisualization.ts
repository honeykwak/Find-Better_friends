import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { ValidatorData } from '../types';

export const useValidatorVisualization = (displayData: any[], selectedChain: string | null, coordinateType: 'mds' | 'tsne') => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  
  // D3 줌 behavior 정의
  const zoom = useMemo(() => 
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 3.5])
      .on('zoom', (event) => {
        if (!gRef.current) return;
        const { transform } = event;
        d3.select(gRef.current).attr('transform', transform);
        setScale(transform.k);
        setPosition({ x: transform.x, y: transform.y });
      }),
    []
  );

  // 시각화 업데이트 함수
  const updateVisualization = useCallback(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    if (Math.abs(width - dimensions.width) > 5 || Math.abs(height - dimensions.height) > 5) {
      setDimensions({ width, height });
      
      // 강제 업데이트 트리거
      setForceUpdate(prev => prev + 1);
      
      // 필요하다면 SVG의 viewBox 설정 업데이트
      d3.select(svgRef.current)
        .attr("viewBox", `0 0 ${width} ${height}`);
    }
  }, [dimensions]);

  // 체인 또는 좌표 타입 변경 시 뷰 리셋
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    setIsAnimating(true);
    
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity)
      .on("end", () => {
        setIsAnimating(false);
      });
    
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedChain, coordinateType, zoom]);

  // ResizeObserver를 사용하여 SVG 컨테이너 크기 변경 감지
  useEffect(() => {
    if (!svgRef.current) return;
    
    updateVisualization();
    
    const observer = new ResizeObserver((entries) => {
      // requestAnimationFrame을 사용하여 브라우저의 다음 렌더링 주기에 업데이트
      requestAnimationFrame(() => {
        updateVisualization();
      });
    });
    
    observer.observe(svgRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [updateVisualization]);

  // 패닝 제한을 위한 범위 계산
  const calculatePanLimits = useCallback(() => {
    if (!svgRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const containerWidth = svgRef.current.clientWidth;
    const containerHeight = svgRef.current.clientHeight;
    const scaledWidth = containerWidth * scale;
    const scaledHeight = containerHeight * scale;
    
    const maxPanX = (scaledWidth - containerWidth) / 2;
    const maxPanY = (scaledHeight - containerHeight) / 2;

    return {
      minX: -maxPanX,
      maxX: maxPanX,
      minY: -maxPanY,
      maxY: maxPanY
    };
  }, [scale]);

  // 이벤트 핸들러들
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (isAnimating) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position, isAnimating]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const limits = calculatePanLimits();
    const newX = Math.min(Math.max(e.clientX - dragStart.x, limits.minX), limits.maxX);
    const newY = Math.min(Math.max(e.clientY - dragStart.y, limits.minY), limits.maxY);
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, calculatePanLimits]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoomPan = useCallback(() => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    setIsAnimating(true);
    
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity)
      .on("end", () => {
        setIsAnimating(false);
      });
    
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [zoom]);

  return {
    svgRef,
    gRef,
    scale,
    position,
    isAnimating,
    isDragging,
    dimensions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoomPan,
    zoom,
    forceUpdate,
  };
};
