import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { CLUSTER_COLORS } from '../../constants';
import { ValidatorData } from '../../types';
import { useValidatorVisualization } from '../../hooks/useValidatorVisualization';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectSelectedProposalsByChain } from '../../store/selectors';
import { ValidatorTooltip } from './ValidatorTooltip';

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

// 노드 크기 상수 정의
const NODE_SIZE = {
  MIN: 4,
  MAX: 12,
  SELECTED: {
    PRIMARY: 2,    // 기본 크기에 더해질 값
    ADDITIONAL: 1   // 기본 크기에 더해질 값
  }
};

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
  
  // 툴크 상태
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
  
  // 제안 데이터와 투표 패턴 데이터를 컴포넌트 레벨에서 가져오기
  const chainProposals = useAppSelector(state => 
    state.proposal.chainProposals[selectedChain || '']?.proposals || {}
  );
  
  const votingPatterns = useAppSelector(state => 
    state.votingPatterns.patternsByChain[selectedChain || '']
  );

  // 선택된 proposals 가져오기
  const selectedProposals = useAppSelector(
    state => selectSelectedProposalsByChain(state, selectedChain || '')
  );

  // participation rate 계산 함수 수정
  const getParticipationRate = (validator: ValidatorData): number => {
    if (!chainProposals || !selectedChain || !votingPatterns) return 0;
    
    // 선택된 proposals이 있으면 그것만 사용, 없으면 전체 proposals 사용
    const proposalIds = selectedProposals.length > 0 
      ? selectedProposals 
      : Object.keys(chainProposals);
    
    if (proposalIds.length === 0) return 0;
    if (!votingPatterns[validator.voter]) return 0;
    
    const participatedProposals = proposalIds.filter(id => {
      const vote = votingPatterns[validator.voter]?.proposal_votes[id]?.option;
      return vote !== undefined;
    });

    return participatedProposals.length / proposalIds.length;
  };

  // 필터링된 displayData 계산 - 체인 뷰 상태에 따라 다르게 처리
  const filteredDisplayData = useMemo(() => {
    // 전체 체인 뷰일 경우 모든 validator 표시
    if (!selectedChain) {
      return displayData;
    }

    // 개별 체인 뷰일 경우에만 proposal 기반 필터링 적용
    return displayData.filter(validator => {
      const participationRate = getParticipationRate(validator);
      return participationRate > 0; // 참여율이 0보다 큰 validator만 표시
    });
  }, [displayData, selectedChain, getParticipationRate, selectedProposals, votingPatterns]);

  // 노드 크기 계산 함수도 체인 뷰 상태에 따라 다르게 처리
  const calculateNodeSize = (validator: ValidatorData): number => {
    // 전체 체인 뷰일 경우 최소 크기 사용
    if (!selectedChain) {
      const baseSize = NODE_SIZE.MIN;
      
      if (currentValidator?.voter === validator.voter) {
        return baseSize + NODE_SIZE.SELECTED.PRIMARY;
      }
      if (additionalValidator?.voter === validator.voter) {
        return baseSize + NODE_SIZE.SELECTED.ADDITIONAL;
      }
      return baseSize;
    }

    // 개별 체인 뷰일 경우 참여율 기반 크기 계산
    const participationRate = getParticipationRate(validator);
    const baseSize = NODE_SIZE.MIN + 
      (NODE_SIZE.MAX - NODE_SIZE.MIN) * participationRate;

    if (currentValidator?.voter === validator.voter) {
      return baseSize + NODE_SIZE.SELECTED.PRIMARY;
    }
    if (additionalValidator?.voter === validator.voter) {
      return baseSize + NODE_SIZE.SELECTED.ADDITIONAL;
    }
    return baseSize;
  };

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
        .attr('r', d => calculateNodeSize(d))
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
          const nodeRadius = calculateNodeSize(d);
          
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
        .attr('r', d => calculateNodeSize(d))
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
          const nodeRadius = calculateNodeSize(d);
          
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
      .data(filteredDisplayData, (d: any) => d.voter);

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
  }, [
    displayData,
    currentValidator,
    additionalValidator,
    hoveredValidator,
    searchTerm,
    isSearchFocused,
    selectedClusters,
    selectedProposals,
    onValidatorClick,
    onValidatorHover,
    zoom,
    dimensions
  ]);

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
    onResetView(() => {
      // 기존 줌/팬 리셋
      resetZoomPan();
      
      // validator 선택 해제를 위해 빈 validator로 클릭 이벤트 발생
      onValidatorClick({} as ValidatorData);
    });
  }, [resetZoomPan, onResetView, onValidatorClick]);

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
        <ValidatorTooltip
          voter={tooltipData.voter}
          position={tooltipData}
          scale={scale}
          mapPosition={position}
          votingPatterns={votingPatterns}
          chainProposals={chainProposals}
          selectedProposals={selectedProposals}
          currentValidator={currentValidator}
          additionalValidator={additionalValidator}
        />
      )}
    </div>
  );
};