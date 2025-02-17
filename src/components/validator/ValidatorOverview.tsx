import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSpring, animated } from "@react-spring/web";
import { usePrevious } from '../../hooks/usePrevious';
import { ClusterType, CoordinateData, ValidatorData } from '../../types';
import { CLUSTER_COLORS } from '../../constants';
import { setSelectedValidator } from '../../store/slices/validatorSlice';
import * as d3 from 'd3';

const CLUSTERS: readonly ClusterType[] = [1, 2, 3, 4, 5];
const ANIMATION_DURATION = 500;
const BATCH_SIZE = 50;
const STAGGER_DELAY = 20;

// 줌 레벨 상수를 체인별로 다르게 설정
const ALL_CHAIN_ZOOM_LEVELS = [0.4, 0.6, 0.8, 1, 1.5, 2];  // 전체 체인용
const SINGLE_CHAIN_ZOOM_LEVELS = [1, 1.5, 2, 2.5, 3, 3.5];  // 개별 체인용

interface EnhancedValidatorData extends ValidatorData {
  isAnimated?: boolean;
  animationBegin?: number;
}

export const ValidatorOverview = () => {
  const dispatch = useAppDispatch();
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousValidators, setPreviousValidators] = useState<Set<string>>(new Set());
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

  // 애니메이션 제어를 위한 상태
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const chartRef = useRef<HTMLDivElement>(null);
  const [currentZoomIndex, setCurrentZoomIndex] = useState(0);  // 현재 줌 레벨 인덱스

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  // 현재 체인에 따른 줌 레벨 선택
  const currentZoomLevels = useMemo(() => 
    selectedChain ? SINGLE_CHAIN_ZOOM_LEVELS : ALL_CHAIN_ZOOM_LEVELS,
    [selectedChain]
  );

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
      
      const response = await fetch('/src/data/coordinates/coordinates.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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
          .range([-0.5, 0.5]);  // -0.5 ~ 0.5 범위로 조정하여 중앙 정렬
        const yScale = d3.scaleLinear()
          .domain([yMin, yMax])
          .range([-0.5, 0.5]);  // -0.5 ~ 0.5 범위로 조정하여 중앙 정렬
        
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
        // 개별 체인의 경우 기존 방식 유지
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

      const currentValidators = new Set(currentData.map(d => d.voter));
      const processedData = currentData.map((d, index) => ({
        ...d,
        isAnimated: true,
        animationBegin: Math.floor(index / BATCH_SIZE) * STAGGER_DELAY
      }));

      setPreviousValidators(currentValidators);
      setShouldAnimate(true);

      return processedData;
    } catch (error) {
      console.error('Error processing display data:', error);
      return [];
    }
  }, [coordinateData, selectedChain]);

  const prevDisplayData = usePrevious(displayData);

  const filteredData = useMemo(() => {
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

  const getBatchedClusterData = useCallback((clusterData: EnhancedValidatorData[]) => {
    const batches = Array.from({ length: Math.ceil(clusterData.length / BATCH_SIZE) }, (_, i) => 
      clusterData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    return { batches };
  }, []);

  const handleClick = useCallback((data: any) => {
    if (data && data.payload) {
      const validator = data.payload;
      if (currentValidator?.voter === validator.voter) {
        dispatch(setSelectedValidator(null));
      } else {
        dispatch(setSelectedValidator(validator));
      }
      // Validator 선택 시 애니메이션 비활성화
      setShouldAnimate(false);
    }
  }, [dispatch, currentValidator]);

  // validator 목록 필터링 및 정렬
  const filteredValidators = useMemo(() => {
    if (!searchTerm.trim()) return displayData;
    const term = searchTerm.toLowerCase();
    
    return displayData
      .filter(validator => 
        validator.voter.toLowerCase().includes(term)
      )
      .sort((a, b) => {
        const aIndex = a.voter.toLowerCase().indexOf(term);
        const bIndex = b.voter.toLowerCase().indexOf(term);
        
        // 검색어 위치가 다르면 앞에 있는 것이 우선
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        
        // 검색어 위치가 같으면 알파벳 순
        return a.voter.localeCompare(b.voter);
      });
  }, [displayData, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const searchContainer = document.querySelector('.search-container');
      if (searchContainer && !searchContainer.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 줌 핸들러 수정
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    
    setCurrentZoomIndex(prevIndex => {
      const newIndex = delta > 0 
        ? Math.max(0, prevIndex - 1)
        : Math.min(currentZoomLevels.length - 1, prevIndex + 1);
      
      setScale(currentZoomLevels[newIndex]);
      return newIndex;
    });
  }, [currentZoomLevels]);

  // 리셋 함수 수정
  const resetZoomPan = useCallback(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    
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

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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

  // 차트 초기화
  useEffect(() => {
    if (!svgRef.current || !filteredData.length) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // margin 설정
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 스케일 설정
    const xScale = d3.scaleLinear()
      .domain([chartBounds.xExtent[0], chartBounds.xExtent[1]])
      .range([margin.left, innerWidth]);

    const yScale = d3.scaleLinear()
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
      .data(filteredData, d => d.voter);

    // 노드 스타일링 부분 수정
    const applyNodeStyles = (selection: d3.Selection<SVGCircleElement, EnhancedValidatorData, any, any>) => {
      selection
        .attr('cx', d => xScale(d.x))
        .attr('cy', d => yScale(d.y))
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

    // Enter 부분 수정
    const nodesEnter = nodes.enter()
      .append('circle')
      .style('opacity', 0)
      .call(applyNodeStyles);

    // Update 부분 수정
    nodes
      .merge(nodesEnter)
      .transition()
      .duration(ANIMATION_DURATION)
      .style('opacity', 1)
      .call(applyNodeStyles);

    // Exit: 제거될 노드
    nodes.exit()
      .transition()
      .duration(ANIMATION_DURATION)
      .style('opacity', 0)
      .remove();

    // 이벤트 핸들러 설정
    g.selectAll<SVGCircleElement, EnhancedValidatorData>('circle')
      .on('click', (event, d) => handleClick({ payload: d }))
      .on('mouseover', function(event, d: EnhancedValidatorData) {
        d3.select(this)
          .transition()
          .duration(200)
          .style('stroke', () => 
            currentValidator?.voter === d.voter 
              ? "#3B82F6" 
              : hoveredValidator === d.voter
                ? "#8B5CF6"
                : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
                  ? "#93C5FD"
                  : "none"
          )
          .style('stroke-width', () =>
            currentValidator?.voter === d.voter || hoveredValidator === d.voter
              ? 3
              : searchTerm && d.voter.toLowerCase().includes(searchTerm.toLowerCase())
                ? 1.5
                : 0
          );
      })
      .on('mouseout', function(event, d: EnhancedValidatorData) {
        if (currentValidator?.voter !== d.voter) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('stroke', 'none')
            .style('stroke-width', 0);
        }
      });
  }, [filteredData, chartBounds, handleClick, currentValidator, hoveredValidator, searchTerm]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-6 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading validator data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-6 flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="w-full h-[600px] bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Validator Overview</h2>
            <button
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={resetZoomPan}
              title="Reset zoom and position"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4zm3 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>
              </svg>
            </button>
          </div>
          <div className="relative search-container">
            <div className="relative">
              <input
                type="text"
                className="w-64 px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search validators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setSearchTerm('');
                    setIsSearchFocused(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {isSearchFocused && (
              <div className="absolute z-10 w-64 mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="absolute inset-0 bg-white opacity-80 backdrop-blur-sm rounded-lg" />
                {filteredValidators.map((validator) => (
                  <div
                    key={validator.voter}
                    className={`
                      relative px-4 py-2 cursor-pointer
                      hover:bg-gray-100/70
                      ${currentValidator?.voter === validator.voter 
                        ? 'bg-blue-50/70 text-blue-600' 
                        : ''
                      }
                    `}
                    onClick={() => {
                      dispatch(setSelectedValidator(validator));
                      setIsSearchFocused(false);
                      setSearchTerm('');
                    }}
                    onMouseEnter={() => setHoveredValidator(validator.voter)}
                    onMouseLeave={() => setHoveredValidator(null)}
                  >
                    {validator.voter}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative w-full h-[90%]">
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <g ref={gRef} />
          </svg>
        </div>
      </div>
    </div>
  );
};