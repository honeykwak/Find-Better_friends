import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { CLUSTER_COLORS } from '../../constants';
import { ValidatorData } from '../../types';
import { useValidatorVisualization } from '../../hooks/useValidatorVisualization';

interface ValidatorMapProps {
  displayData: any[];
  selectedChain: string | null;
  coordinateType: 'mds' | 'tsne';
  currentValidator: ValidatorData | null;
  additionalValidator: ValidatorData | null;
  selectedClusters: number[];
  hoveredValidator: string | null;
  searchTerm: string;
  isSearchFocused: boolean;
  onValidatorClick: (validator: ValidatorData) => void;
  onValidatorHover: (validatorId: string | null) => void;
  onResetView: (resetFn: () => void) => void;
}

export const ValidatorMap: React.FC<ValidatorMapProps> = ({
  displayData,
  selectedChain,
  coordinateType,
  currentValidator,
  additionalValidator,
  selectedClusters,
  hoveredValidator,
  searchTerm,
  isSearchFocused,
  onValidatorClick,
  onValidatorHover,
  onResetView
}) => {
  const {
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
    zoom
  } = useValidatorVisualization(displayData, selectedChain, coordinateType);
  
  // 툴팁 상태
  const [tooltipData, setTooltipData] = useState<{
    voter: string;
    x: number;
    y: number;
  } | null>(null);
  
  // 스케일 ref
  const scaleRef = useRef<{
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
  }>({ 
    xScale: d3.scaleLinear(), 
    yScale: d3.scaleLinear() 
  });
  
  // 노드 렌더링 로직
  useEffect(() => {
    if (!svgRef.current || !displayData.length) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const width = dimensions.width || svgRef.current.clientWidth;
    const height = dimensions.height || svgRef.current.clientHeight;

    // margin 설정
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 스케일 설정 및 ref 업데이트 - 0-1 범위의 데이터를 SVG 좌표로 변환
    scaleRef.current.xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.left, innerWidth]);

    scaleRef.current.yScale = d3.scaleLinear()
      .domain([0, 1])
      .range([margin.top, innerHeight]);

    // 줌 설정
    svg.call(zoom);

    // 노드 스타일링 함수들
    const applyStaticStyles = (selection: d3.Selection<SVGCircleElement, any, any, any>) => {
      selection
        .attr('cx', d => scaleRef.current.xScale(d.x))
        .attr('cy', d => scaleRef.current.yScale(d.y))
        .attr('r', d => 
          currentValidator?.voter === d.voter ? 8 : 
          additionalValidator?.voter === d.voter ? 7 : 5
        )
        .style('fill', d => 
          selectedClusters.length === 0 || selectedClusters.includes(d.cluster)
            ? CLUSTER_COLORS[d.cluster]
            : "#E5E7EB" // 연한 회색으로 변경 (필터링에서 제외된 클러스터)
        )
        .style('cursor', 'pointer')
        .style('stroke', d => {
          // 클러스터 필터링 적용
          const passesClusterFilter = selectedClusters.length === 0 || 
                                    selectedClusters.includes(d.cluster);
          
          // 검색어 매치 여부
          const matchesSearchTerm = searchTerm && 
                                  d.voter.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 검색 하이라이트는 클러스터 필터를 통과한 경우에만 적용
          const shouldHighlightSearch = passesClusterFilter && matchesSearchTerm && isSearchFocused;
          
          return currentValidator?.voter === d.voter 
            ? "#3B82F6" // 기준 validator - 파란색
            : additionalValidator?.voter === d.voter
              ? "#10B981" // 추가 validator - 녹색
              : hoveredValidator === d.voter
                ? "#8B5CF6" // 호버 - 보라색
                : shouldHighlightSearch
                  ? "#93C5FD" // 검색 결과 - 연한 파란색
                  : "none";
        })
        .style('stroke-width', d => {
          // 클러스터 필터링 적용
          const passesClusterFilter = selectedClusters.length === 0 || 
                                    selectedClusters.includes(d.cluster);
          
          // 검색어 매치 여부
          const matchesSearchTerm = searchTerm && 
                                  d.voter.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 검색 하이라이트는 클러스터 필터를 통과한 경우에만 적용
          const shouldHighlightSearch = passesClusterFilter && matchesSearchTerm && isSearchFocused;
          
          // 노드 반지름 계산
          const nodeRadius = 
            currentValidator?.voter === d.voter ? 8 : 
            additionalValidator?.voter === d.voter ? 7 : 5;
          
          // 강조 표시가 필요한 경우 노드 반지름의 3/4을 테두리 두께로 설정
          return (currentValidator?.voter === d.voter || 
                additionalValidator?.voter === d.voter || 
                hoveredValidator === d.voter || 
                shouldHighlightSearch)
                  ? nodeRadius * 0.75
                  : 0;
        });
    };

    const applyTransitionStyles = (transition: d3.Transition<SVGCircleElement, any, any, any>) => {
      transition
        .attr('cx', d => scaleRef.current.xScale(d.x))
        .attr('cy', d => scaleRef.current.yScale(d.y))
        .attr('r', d => 
          currentValidator?.voter === d.voter ? 8 : 
          additionalValidator?.voter === d.voter ? 7 : 5
        )
        .style('fill', d => 
          selectedClusters.length === 0 || selectedClusters.includes(d.cluster)
            ? CLUSTER_COLORS[d.cluster]
            : "#E5E7EB" // 연한 회색으로 변경 (필터링에서 제외된 클러스터)
        )
        .style('opacity', 1) // 항상 완전 불투명하게 설정
        .style('stroke', d => {
          // 클러스터 필터링 적용
          const passesClusterFilter = selectedClusters.length === 0 || 
                                    selectedClusters.includes(d.cluster);
          
          // 검색어 매치 여부
          const matchesSearchTerm = searchTerm && 
                                  d.voter.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 검색 하이라이트는 클러스터 필터를 통과한 경우에만 적용
          const shouldHighlightSearch = passesClusterFilter && matchesSearchTerm && isSearchFocused;
          
          return currentValidator?.voter === d.voter 
            ? "#3B82F6" // 기준 validator - 파란색
            : additionalValidator?.voter === d.voter
              ? "#10B981" // 추가 validator - 녹색
              : hoveredValidator === d.voter
                ? "#8B5CF6" // 호버 - 보라색
                : shouldHighlightSearch
                  ? "#93C5FD" // 검색 결과 - 연한 파란색
                  : "none";
        })
        .style('stroke-width', d => {
          // 클러스터 필터링 적용
          const passesClusterFilter = selectedClusters.length === 0 || 
                                    selectedClusters.includes(d.cluster);
          
          // 검색어 매치 여부
          const matchesSearchTerm = searchTerm && 
                                  d.voter.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 검색 하이라이트는 클러스터 필터를 통과한 경우에만 적용
          const shouldHighlightSearch = passesClusterFilter && matchesSearchTerm && isSearchFocused;
          
          // 노드 반지름 계산
          const nodeRadius = 
            currentValidator?.voter === d.voter ? 8 : 
            additionalValidator?.voter === d.voter ? 7 : 5;
          
          // 강조 표시가 필요한 경우 노드 반지름의 3/4을 테두리 두께로 설정
          return (currentValidator?.voter === d.voter || 
                additionalValidator?.voter === d.voter || 
                hoveredValidator === d.voter || 
                shouldHighlightSearch)
                  ? nodeRadius * 0.75
                  : 0;
        });
    };

    // 기존 노드 선택
    const nodes = g.selectAll<SVGCircleElement, any>('circle')
      .data(displayData, (d: any) => d.voter);

    // Enter 부분 수정
    const nodesEnter = nodes.enter()
      .append('circle')
      .style('opacity', 0)
      .call(selection => applyStaticStyles(selection));

    // Update 부분 수정
    nodes
      .merge(nodesEnter)
      .transition()
      .duration(500) // ANIMATION_DURATION
      .style('opacity', 1)
      .call(transition => applyTransitionStyles(transition));

    // Exit: 제거될 노드
    nodes.exit()
      .transition()
      .duration(500) // ANIMATION_DURATION
      .style('opacity', 0)
      .remove();

    // 이벤트 핸들러 설정
    g.selectAll<SVGCircleElement, any>('circle')
      .on('click', (_, d) => onValidatorClick(d))
      .on('mouseover', (_, d) => {
        onValidatorHover(d.voter);
        setTooltipData({
          voter: d.voter,
          x: scaleRef.current.xScale(d.x),
          y: scaleRef.current.yScale(d.y)
        });
      })
      .on('mouseout', () => {
        onValidatorHover(null);
        setTooltipData(null);
      });

    // 노드 순서 업데이트
    updateNodeOrder();
  }, [displayData, currentValidator, additionalValidator, hoveredValidator, searchTerm, isSearchFocused, selectedClusters, onValidatorClick, onValidatorHover, zoom, dimensions]);

  // 노드 순서 조정 함수
  const updateNodeOrder = () => {
    if (!gRef.current) return;
    
    d3.select(gRef.current)
      .selectAll<SVGCircleElement, any>('circle')
      .sort((a, b) => {
        // 1. 현재 선택된 validator, 추가 validator, 호버된 validator를 최상위로
        const aIsSpecial = 
          a.voter === currentValidator?.voter || 
          a.voter === additionalValidator?.voter || 
          a.voter === hoveredValidator;
        
        const bIsSpecial = 
          b.voter === currentValidator?.voter || 
          b.voter === additionalValidator?.voter || 
          b.voter === hoveredValidator;
        
        if (aIsSpecial && !bIsSpecial) return 1;
        if (!aIsSpecial && bIsSpecial) return -1;
        
        // 2. 선택된 클러스터의 노드를 그 다음으로
        if (selectedClusters.length > 0) {
          const aSelected = selectedClusters.includes(a.cluster);
          const bSelected = selectedClusters.includes(b.cluster);
          
          if (aSelected && !bSelected) return 1;
          if (!aSelected && bSelected) return -1;
        }
        
        // 3. 기본적으로는 클러스터 번호로 정렬
        return a.cluster - b.cluster;
      });
  };

  // 선택된 clusters가 변경될 때 노드 순서 업데이트
  useEffect(() => {
    updateNodeOrder();
  }, [selectedClusters, currentValidator, additionalValidator, hoveredValidator]);

  // SVG 요소에 mousedown 이벤트 연결
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleMouseDown]);

  // useEffect 추가 - 외부에서 호출 가능하도록
  useEffect(() => {
    onResetView(() => resetZoomPan());
  }, [resetZoomPan, onResetView]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <g ref={gRef} />
      </svg>
      {tooltipData && (
        <div 
          className={`
            absolute bg-white p-3 border rounded shadow
            ${currentValidator?.voter === tooltipData.voter ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
            ${additionalValidator?.voter === tooltipData.voter ? 'ring-2 ring-green-500 bg-green-50' : ''}
          `}
          style={{ 
            left: (tooltipData.x * scale + position.x) + 15,
            top: (tooltipData.y * scale + position.y) - 10,
            transformOrigin: 'top left',
            pointerEvents: 'none'
          }}
        >
          <p className={`font-medium 
            ${currentValidator?.voter === tooltipData.voter ? 'text-blue-600' : ''}
            ${additionalValidator?.voter === tooltipData.voter ? 'text-green-600' : ''}
          `}>
            {tooltipData.voter}
            {currentValidator?.voter === tooltipData.voter && 
              <span className="ml-2 text-xs">(Primary)</span>}
            {additionalValidator?.voter === tooltipData.voter && 
              <span className="ml-2 text-xs">(Additional)</span>}
          </p>
        </div>
      )}
    </div>
  );
};