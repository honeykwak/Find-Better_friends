import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { CoordinateData, ValidatorData } from '../../types';
import { CLUSTER_COLORS } from '../../constants';
import { setSelectedValidator } from '../../store/slices/validatorSlice';
import { setValidatorChains } from '../../store/slices/chainSlice';
import * as d3 from 'd3';
import { SearchInput } from '../common/SearchInput';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { SearchResult } from '../../types/search';

const ANIMATION_DURATION = 500;
const BATCH_SIZE = 50;
const STAGGER_DELAY = 20;

interface EnhancedValidatorData extends ValidatorData {
  isAnimated: boolean;
  animationBegin: number;
}

export const ValidatorOverview = () => {
  const dispatch = useAppDispatch();
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hoveredValidator, setHoveredValidator] = useState<string | null>(null);

  // 글로벌 좌표 범위 상태 추가
  const [globalXMin, setGlobalXMin] = useState<number | null>(null);
  const [globalXMax, setGlobalXMax] = useState<number | null>(null);
  const [globalYMin, setGlobalYMin] = useState<number | null>(null);
  const [globalYMax, setGlobalYMax] = useState<number | null>(null);

  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const currentValidator = useAppSelector(state => state.validator.selectedValidator);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  // D3 줌 behavior 설정을 먼저 정의
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

  // 그 다음 체인 변경 시 초기화 effect 정의
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    // 트랜지션과 함께 초기 상태로 리셋
    svg.transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity
      );
    
    // 상태 업데이트
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedChain, zoom]);

  const createValidatorChainMap = useCallback((data: CoordinateData) => {
    const mapping = new Map<string, Set<string>>();
    
    Object.entries(data.chain_coords_dict).forEach(([chainId, validators]) => {
      validators.forEach(validator => {
        const chainSet = mapping.get(validator.voter) || new Set<string>();
        chainSet.add(chainId);
        mapping.set(validator.voter, chainSet);
      });
    });

    return mapping;
  }, []);

  const loadCoordinates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/data/coordinates/coordinates.json');
      const data: CoordinateData = await response.json();
      setCoordinateData(data);
      
      const mapping = createValidatorChainMap(data);
      setValidatorChainMap(mapping);

      // 글로벌 좌표 범위 계산
      const allValidators = [
        ...(data.coords_dict.onehot || []),
        ...Object.values(data.chain_coords_dict).flat()
      ];

      const xValues = allValidators.map(v => v.mds_x ?? 0);
      const yValues = allValidators.map(v => v.mds_y ?? 0);

      setGlobalXMin(Math.min(...xValues));
      setGlobalXMax(Math.max(...xValues));
      setGlobalYMin(Math.min(...yValues));
      setGlobalYMax(Math.max(...yValues));
    } catch (error) {
      console.error('Error loading coordinates:', error);
      setError('Failed to load validator data.');
    } finally {
      setIsLoading(false);
    }
  }, [createValidatorChainMap]);

  useEffect(() => {
    loadCoordinates();
  }, [loadCoordinates]);

  useEffect(() => {
    if (selectedChain && currentValidator) {
      const validatorChains = validatorChainMap.get(currentValidator.voter);
      if (!validatorChains?.has(selectedChain)) {
        dispatch(setSelectedValidator(null));
      }
    }
  }, [selectedChain, currentValidator, validatorChainMap, dispatch]);

  const displayData = useMemo(() => {
    if (!coordinateData) return [];
    
    try {
      let currentData;
      if (!selectedChain) {
        // 전체 체인(onehot) 데이터의 경우
        const onehotData = coordinateData.coords_dict?.onehot || [];
        
        // x, y 좌표의 범위 계산
        const xValues = onehotData.map(d => d.x ?? 0);
        const yValues = onehotData.map(d => d.y ?? 0);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        
        // 중앙 정렬을 위한 스케일 조정
        const xScale = d3.scaleLinear()
          .domain([xMin, xMax])
          .range([-0.5, 0.5]);
        const yScale = d3.scaleLinear()
          .domain([yMin, yMax])
          .range([-0.5, 0.5]);
        
        currentData = onehotData.map(d => ({
          voter: d.voter,
          x: xScale(d.x ?? 0),
          y: yScale(d.y ?? 0),
          cluster: d.cluster,
          mds_x: d.mds_x,
          mds_y: d.mds_y,
          tsne_x: d.tsne_x,
          tsne_y: d.tsne_y
        }));
      } else {
        // 개별 체인의 경우
        currentData = (coordinateData.chain_coords_dict?.[selectedChain] || []).map(d => ({
          voter: d.voter,
          x: d.mds_x ?? 0,
          y: d.mds_y ?? 0,
          cluster: d.cluster,
          mds_x: d.mds_x,
          mds_y: d.mds_y,
          tsne_x: d.tsne_x,
          tsne_y: d.tsne_y
        }));
      }

      const processedData = currentData.map((d, index) => ({
        ...d,
        isAnimated: true,
        animationBegin: Math.floor(index / BATCH_SIZE) * STAGGER_DELAY
      }));

      return processedData;
    } catch (error) {
      console.error('Error processing display data:', error);
      return [];
    }
  }, [coordinateData, selectedChain]);

  const filteredValidators = useMemo(() => {
    return displayData.filter(d => 
      selectedClusters.length === 0 || selectedClusters.includes(d.cluster)
    );
  }, [displayData, selectedClusters]);

  const chartBounds = useMemo(() => {
    if (globalXMin === null || globalXMax === null || globalYMin === null || globalYMax === null) {
      return {
        xExtent: [-10, 10],
        yExtent: [-10, 10],
        xPadding: 1,
        yPadding: 1
      };
    }

    const xPadding = (globalXMax - globalXMin) * 0.05;
    const yPadding = (globalYMax - globalYMin) * 0.05;

    return { 
      xExtent: [globalXMin - xPadding, globalXMax + xPadding], 
      yExtent: [globalYMin - yPadding, globalYMax + yPadding],
      xPadding,
      yPadding 
    };
  }, [globalXMin, globalXMax, globalYMin, globalYMax]);

  const handleClick = useCallback((data: any) => {
    if (data && data.payload) {
      const validator = data.payload;
      if (currentValidator?.voter === validator.voter) {
        console.log('Deselecting validator');
        dispatch(setSelectedValidator(null));
        dispatch(setValidatorChains([]));
      } else {
        const validatorChains = Array.from(validatorChainMap.get(validator.voter) || []);
        console.log('Selecting validator:', validator.voter);
        console.log('Validator chains:', validatorChains);
        dispatch(setSelectedValidator(validator));
        dispatch(setValidatorChains(validatorChains));
      }
    }
  }, [dispatch, currentValidator, validatorChainMap]);

  // 줌 핸들러 수정
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    
    setScale(prevScale => {
      const newScale = delta > 0 
        ? Math.min(prevScale * 1.1, 3.5)
        : Math.max(prevScale / 1.1, 1);
      return newScale;
    });
  }, []);

  // 리셋 함수 수정
  const resetZoomPan = useCallback(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    
    svg.transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity
      );
    
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [zoom]);

  // 패닝 제한을 위한 범위 계산
  const calculatePanLimits = useCallback(() => {
    if (!chartRef.current) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const container = chartRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
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

  // 드래그 핸들러 수정
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const limits = calculatePanLimits();
    const newX = Math.min(Math.max(e.clientX - dragStart.x, limits.minX), limits.maxX);
    const newY = Math.min(Math.max(e.clientY - dragStart.y, limits.minY), limits.maxY);
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, calculatePanLimits]);

  // 드래그 핸들러 수정
  const handleMouseDown = useCallback((e: MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 이벤트 리스너 설정
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      chart.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp]);

  // 스케일 ref 추가
  const scaleRef = useRef<{
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
  }>({ 
    xScale: d3.scaleLinear(), 
    yScale: d3.scaleLinear() 
  });
  
  // 툴팁 state를 다른 state들과 함께 상단으로 이동
  const [tooltipData, setTooltipData] = useState<{
    voter: string;
    x: number;
    y: number;
  } | null>(null);

  // 노드 스타일링 함수들 분리
  const applyStaticStyles = (selection: d3.Selection<SVGCircleElement, EnhancedValidatorData, any, any>) => {
    selection
      .attr('cx', d => scaleRef.current.xScale(d.x))
      .attr('cy', d => scaleRef.current.yScale(d.y))
      .attr('r', d => currentValidator?.voter === d.voter ? 8 : 5)
      .style('fill', d => CLUSTER_COLORS[d.cluster])
      .style('cursor', 'pointer')
      .style('stroke', d => 
        currentValidator?.voter === d.voter 
          ? "#3B82F6"
          : hoveredValidator === d.voter
            ? "#8B5CF6"
            : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
              ? "#93C5FD"
              : "none"
      )
      .style('stroke-width', d =>
        currentValidator?.voter === d.voter || hoveredValidator === d.voter
          ? 3
          : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
            ? 1.5
            : 0
      );
  };

  const applyTransitionStyles = (transition: d3.Transition<SVGCircleElement, EnhancedValidatorData, any, any>) => {
    transition
      .attr('cx', d => scaleRef.current.xScale(d.x))
      .attr('cy', d => scaleRef.current.yScale(d.y))
      .attr('r', d => currentValidator?.voter === d.voter ? 8 : 5)
      .style('fill', d => CLUSTER_COLORS[d.cluster])
      .style('stroke', d => 
        currentValidator?.voter === d.voter 
          ? "#3B82F6"
          : hoveredValidator === d.voter
            ? "#8B5CF6"
            : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
              ? "#93C5FD"
              : "none"
      )
      .style('stroke-width', d =>
        currentValidator?.voter === d.voter || hoveredValidator === d.voter
          ? 3
          : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
            ? 1.5
            : 0
      );
  };

  // 차트 초기화
  useEffect(() => {
    if (!svgRef.current || !filteredValidators.length) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // margin 설정
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 스케일 설정 및 ref 업데이트
    scaleRef.current.xScale = d3.scaleLinear()
      .domain([chartBounds.xExtent[0], chartBounds.xExtent[1]])
      .range([margin.left, innerWidth]);

    scaleRef.current.yScale = d3.scaleLinear()
      .domain([chartBounds.yExtent[0], chartBounds.yExtent[1]])
      .range([innerHeight, margin.top]);

    // 줌 설정 수정
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 3.5])
      .translateExtent([[0, 0], [width, height]])  // 패닝 범위를 SVG 크기로 제한
      .extent([[0, 0], [width, height]])           // 줌 범위도 SVG 크기로 제한
      .on('zoom', (event) => {
        const { transform } = event;
        g.attr('transform', transform.toString());
        setScale(transform.k);
        setPosition({ x: transform.x, y: transform.y });
      });

    svg.call(zoom);

    // 기존 노드 선택
    const nodes = g.selectAll<SVGCircleElement, EnhancedValidatorData>('circle')
      .data(filteredValidators, d => d.voter);

    // Enter 부분 수정
    const nodesEnter = nodes.enter()
      .append('circle')
      .style('opacity', 0)
      .call(applyStaticStyles);

    // Update 부분 수정
    nodes
      .merge(nodesEnter)
      .transition()
      .duration(ANIMATION_DURATION)
      .style('opacity', 1)
      .call(applyTransitionStyles);

    // Exit: 제거될 노드
    nodes.exit()
      .transition()
      .duration(ANIMATION_DURATION)
      .style('opacity', 0)
      .remove();

    // 이벤트 핸들러 설정 부분 수정
    g.selectAll<SVGCircleElement, EnhancedValidatorData>('circle')
      .on('click', (_, d) => handleClick({ payload: d }))
      .on('mouseover', (_, d: EnhancedValidatorData) => {
        setHoveredValidator(d.voter);
        setTooltipData({
          voter: d.voter,
          x: scaleRef.current.xScale(d.x),
          y: scaleRef.current.yScale(d.y)
        });
      })
      .on('mouseout', () => {
        setHoveredValidator(null);
        setTooltipData(null);
      });
  }, [filteredValidators, chartBounds, handleClick, currentValidator, hoveredValidator, searchTerm]);

  // SVG에 mousedown 이벤트 핸들러 연결
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      svg.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleMouseDown]);

  // 검색 결과 계산 - 클러스터 필터 적용
  const searchResults: SearchResult<ValidatorData>[] = useMemo(() => {
    if (!searchTerm || !displayData) return [];
    
    return displayData
      .filter(validator => 
        validator.voter.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(validator => ({
        id: validator.voter,
        text: validator.voter,
        data: validator
      }));
  }, [searchTerm, displayData]);

  const handleResultClick = (result: SearchResult<ValidatorData>) => {
    if (!result || !result.data) return;
    dispatch(setSelectedValidator(result.data));
    if (result.data.voter) {
      const validatorChains = validatorChainMap.get(result.data.voter);
      if (validatorChains) {
        dispatch(setValidatorChains(Array.from(validatorChains)));
      }
    }
    setIsSearchFocused(false);
  };

  if (isLoading) {
    return (
      <Card className="h-full w-full">
        <div className="shrink-0 mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Validator Overview</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetZoomPan}
              >
                Reset View
              </Button>
            </div>
            <div className="search-container relative">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onClear={() => setIsSearchFocused(false)}
                placeholder="Search validators..."
                results={searchResults}
                onResultClick={handleResultClick}
                onResultHover={(result) => setHoveredValidator(result ? result.id : null)}
              />
            </div>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg text-gray-600">Loading validator data...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full w-full">
        <div className="shrink-0 mb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Validator Overview</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetZoomPan}
              >
                Reset View
              </Button>
            </div>
            <div className="search-container relative">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onClear={() => setIsSearchFocused(false)}
                placeholder="Search validators..."
                results={searchResults}
                onResultClick={handleResultClick}
                onResultHover={(result) => setHoveredValidator(result ? result.id : null)}
              />
            </div>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full">
      <div className="shrink-0 mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Validator Overview</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetZoomPan}
            >
              Reset View
            </Button>
          </div>
          <div className="search-container relative">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onClear={() => setIsSearchFocused(false)}
              placeholder="Search validators..."
              results={searchResults}
              onResultClick={handleResultClick}
              onResultHover={(result) => setHoveredValidator(result ? result.id : null)}
            />
          </div>
        </div>
      </div>
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
            `}
            style={{ 
              left: (tooltipData.x * scale + position.x) + 15,  // 줌과 패닝을 고려한 위치 계산
              top: (tooltipData.y * scale + position.y) - 10,   // 줌과 패닝을 고려한 위치 계산
              transformOrigin: 'top left',
              pointerEvents: 'none'
              // transform 속성 제거 - 툴팁 크기는 고정
            }}
          >
            <p className={`font-medium ${currentValidator?.voter === tooltipData.voter ? 'text-blue-600' : ''}`}>
              {tooltipData.voter}
              {currentValidator?.voter === tooltipData.voter && <span className="ml-2 text-xs">(Selected)</span>}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};