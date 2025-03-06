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

  // 새로운 viewMode 상태 추가
  const [viewMode, setViewMode] = useState<'default' | 'ego-network'>('default');

  // ego-network 뷰에서 사용할 위치 계산 함수
  const calculateEgoNetworkPositions = useCallback(() => {
    if (!currentValidator || !votingPatterns || !selectedChain) return displayData;
    
    // 기준 validator ID
    const baseValidatorId = currentValidator.voter;
    
    // 중심점 설정 (0.5, 0.5)는 SVG의 중앙을 의미
    const centerX = 0.5;
    const centerY = 0.5;
    
    // 원의 반지름 (0 ~ 1 사이 좌표계 기준)
    const maxRadius = 0.4; // 최대 반지름
    
    return displayData.map(validator => {
      // 기준 validator는 중앙에 배치
      if (validator.voter === baseValidatorId) {
        return {
          ...validator,
          x: centerX,
          y: centerY
        };
      }
      
      // proposal match rate 계산
      let matchRate = 0;
      
      // validator와 기준 validator의 proposal match rate 계산
      const baseVotes = votingPatterns[baseValidatorId]?.proposal_votes || {};
      const validatorVotes = votingPatterns[validator.voter]?.proposal_votes || {};
      
      // 선택된 proposal이 있으면 그것만 사용, 없으면 모든 proposal 사용
      const proposalIds = selectedProposals.length > 0
        ? selectedProposals
        : Object.keys(chainProposals);
      
      if (proposalIds.length > 0) {
        let matches = 0;
        let totalComparableVotes = 0;
        
        proposalIds.forEach(id => {
          const baseVote = baseVotes[id]?.option;
          const validatorVote = validatorVotes[id]?.option;
          
          // 둘 다 투표한 경우에만 비교
          if (baseVote !== undefined && validatorVote !== undefined) {
            totalComparableVotes++;
            if (baseVote === validatorVote) {
              matches++;
            }
          }
        });
        
        matchRate = totalComparableVotes > 0 ? matches / totalComparableVotes : 0;
      }
      
      // matchRate를 반지름으로 변환 (1에 가까울수록 중심에 가깝게)
      const radius = maxRadius * (1 - matchRate);
      
      // 각도 계산 (validator의 cluster를 기준으로 비슷한 cluster끼리 모이도록)
      const angle = (validator.cluster / 5) * 2 * Math.PI + 
                   (validator.voter.charCodeAt(0) % 100) / 100 * Math.PI; // 약간의 무작위성 추가
      
      // 극좌표를 직교좌표로 변환
      return {
        ...validator,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
  }, [currentValidator, votingPatterns, selectedChain, displayData, chainProposals, selectedProposals]);

  // viewMode에 따라 다른 displayData 사용
  const effectiveDisplayData = useMemo(() => {
    // 전체 체인 뷰에서는 항상 filteredDisplayData 사용
    if (!selectedChain) {
      return filteredDisplayData;
    }
    
    // 개별 체인 뷰에서만 ego-network 모드 적용
    if (viewMode === 'ego-network' && currentValidator) {
      return calculateEgoNetworkPositions();
    }
    
    return filteredDisplayData;
  }, [viewMode, filteredDisplayData, calculateEgoNetworkPositions, currentValidator, selectedChain]);

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
      .data(effectiveDisplayData, (d: any) => d.voter);

    // 전체 체인 뷰로 전환할 때 성능 최적화
    const isFullChainView = !selectedChain;
    const transitionDuration = isFullChainView ? 200 : 500; // 전체 뷰에서는 빠른 전환

    // Enter 부분 수정
    const nodesEnter = nodes.enter()
      .append('circle')
      .style('opacity', 0)
      .attr('cx', d => scaleRef.current.xScale(d.x))
      .attr('cy', d => scaleRef.current.yScale(d.y))
      .attr('r', d => calculateNodeSize(d));

    // 노드 수가 많으면 배치 처리 최적화
    if (nodes.enter().size() > 200) {
      // 배치 처리: 단순히 표시만 하고 복잡한 스타일은 나중에
      nodesEnter
        .style('fill', d => CLUSTER_COLORS[d.cluster])
        .transition()
        .duration(transitionDuration)
        .style('opacity', 1);
      
      // 이후 복잡한 스타일은 requestAnimationFrame으로 지연
      requestAnimationFrame(() => {
        g.selectAll<SVGCircleElement, any>('circle')
          .call(selection => applyStaticStyles(selection));
      });
    } else {
      // 소량 데이터는 일반 방식으로 처리
      nodesEnter
        .call(selection => applyStaticStyles(selection))
        .transition()
        .duration(transitionDuration)
        .style('opacity', 1);
    }

    // Update 부분 수정 (전체 뷰는 간소화)
    nodes
      .merge(nodesEnter)
      .transition()
      .duration(transitionDuration)
      .attr('cx', d => scaleRef.current.xScale(d.x))
      .attr('cy', d => scaleRef.current.yScale(d.y))
      .attr('r', d => calculateNodeSize(d))
      .style('opacity', 1);

    // 이후에 스타일 적용 (지연)
    setTimeout(() => {
      g.selectAll<SVGCircleElement, any>('circle')
        .call(selection => applyStaticStyles(selection));
    }, transitionDuration + 50);

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
    dimensions,
    viewMode,
    calculateEgoNetworkPositions
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

  // viewMode 전환 최적화
  useEffect(() => {
    // 체인 전환 중에는 viewMode 업데이트를 지연시킴
    if (selectedChain) {
      // 개별 체인 뷰에서만 ego-network 모드 적용 고려
      if (currentValidator && !additionalValidator) {
        setViewMode('ego-network');
      } else if (!currentValidator) {
        setViewMode('default');
      }
    } else {
      // 전체 체인 뷰에서는 항상 기본 모드 사용
      setViewMode('default');
    }
  }, [currentValidator, additionalValidator, selectedChain]);

  return (
    <div className="min-h-0 flex-1 overflow-hidden relative">
      {/* 모드 전환 버튼 추가 */}
      {currentValidator && (
        <div className="absolute top-2 right-2 z-10">
          <button
            className={`px-3 py-1 text-xs rounded-md transition-colors
              ${viewMode === 'default' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600'}
            `}
            onClick={() => setViewMode(viewMode === 'default' ? 'ego-network' : 'default')}
          >
            {viewMode === 'default' ? 'Show Ego Network' : 'Show Default View'}
          </button>
        </div>
      )}
      
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