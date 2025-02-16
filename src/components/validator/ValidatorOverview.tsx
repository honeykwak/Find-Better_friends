import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSpring, animated } from "@react-spring/web";
import { usePrevious } from '../../hooks/usePrevious';
import { ClusterType, CoordinateData, ValidatorData } from '../../types';
import { CLUSTER_COLORS } from '../../constants';
import { setSelectedValidator } from '../../store/slices/validatorSlice';

const CLUSTERS: readonly ClusterType[] = [1, 2, 3, 4, 5];
const ANIMATION_DURATION = 500;
const BATCH_SIZE = 50;
const STAGGER_DELAY = 20;

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
        currentData = coordinateData.coords_dict?.onehot || [];
      } else {
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
      
      // 체인 전환 시 애니메이션 활성화
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

  // 줌 핸들러
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    setScale(prevScale => {
      const newScale = delta > 0 
        ? Math.max(1, prevScale - 0.1)  // 축소 (최소 1배)
        : Math.min(5, prevScale + 0.1);  // 확대 (최대 5배)
      return newScale;
    });
  }, []);

  // 드래그 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

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
          <h2 className="text-xl font-semibold">Validator Overview</h2>
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

        <div 
          ref={chartRef}
          className="relative w-full h-[90%] overflow-auto"
          style={{
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              width: scale > 1 ? `${100 * scale}%` : '100%',
              height: scale > 1 ? `${100 * scale}%` : '100%',
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart 
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s'
                }}
              >
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={[chartBounds.xExtent[0], chartBounds.xExtent[1]]}
                  hide={true}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  domain={[chartBounds.yExtent[0], chartBounds.yExtent[1]]}
                  hide={true}
                />
                <ZAxis type="number" range={[50]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const data = payload[0].payload as ValidatorData;
                    const isSelected = currentValidator?.voter === data.voter;
                    return (
                      <div className={`
                        bg-white p-3 border rounded shadow
                        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                      `}>
                        <p className={`font-medium ${isSelected ? 'text-blue-600' : ''}`}>
                          {data.voter}
                          {isSelected && <span className="ml-2 text-xs">(Selected)</span>}
                        </p>
                      </div>
                    );
                  }}
                />
                {CLUSTERS.map((cluster) => {
                  const clusterData = filteredData.filter(d => d.cluster === cluster);
                  const { batches } = getBatchedClusterData(clusterData);

                  return (
                    <React.Fragment key={cluster}>
                      {batches.map((batch, batchIndex) => (
                        <Scatter
                          key={`${cluster}-batch-${batchIndex}`}
                          data={batch}
                          fill={CLUSTER_COLORS[cluster]}
                          isAnimationActive={false}
                          onClick={handleClick}
                          cursor="pointer"
                          shape={(props: any) => {
                            const { cx, cy, fill, payload } = props;
                            let startCx = cx, startCy = cy, initialOpacity = 1;
                            if (prevDisplayData) {
                              const prevPoint = prevDisplayData.find((p: any) => p.voter === payload.voter);
                              if (prevPoint) {
                                const xScale = props.xAxis.scale;
                                const yScale = props.yAxis.scale;
                                startCx = xScale(prevPoint.x);
                                startCy = yScale(prevPoint.y);
                              } else {
                                initialOpacity = 0;
                              }
                            }
                            const springProps = useSpring({
                              from: { cx: startCx, cy: startCy, opacity: initialOpacity },
                              to: { cx, cy, opacity: 1 },
                              config: { tension: 170, friction: 26 },
                              immediate: !shouldAnimate,
                            });

                            const isSelected = currentValidator?.voter === payload.voter;
                            const isSearchMatch = searchTerm && payload.voter.toLowerCase().includes(searchTerm.toLowerCase());
                            const isHovered = hoveredValidator === payload.voter;

                            return (
                              <animated.circle
                                cx={springProps.cx}
                                cy={springProps.cy}
                                r={isSelected ? 8 : 5}
                                fill={fill}
                                stroke={
                                  isSelected 
                                    ? "#3B82F6"  // 선택된 validator: 진한 파란색
                                    : isHovered
                                      ? "#8B5CF6"  // hover된 validator: 보라색
                                      : isSearchMatch && isSearchFocused
                                        ? "#93C5FD"  // 검색된 validator: 연한 파란색 (검색 중일 때만)
                                        : "none"
                                }
                                strokeWidth={
                                  isSelected || isHovered
                                    ? 3  // 선택되거나 hover된 경우: 두꺼운 테두리
                                    : isSearchMatch && isSearchFocused
                                      ? 1.5  // 검색된 경우: 얇은 테두리
                                      : 0
                                }
                                style={{ 
                                  opacity: springProps.opacity,
                                  transition: 'stroke-width 0.2s, stroke 0.2s'
                                }}
                              />
                            );
                          }}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};