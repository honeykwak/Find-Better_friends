import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
          <div className="text-sm text-gray-500">
            {selectedChain && coordinateData?.chain_info?.[selectedChain]?.name ? (
              <span>Showing validators for {coordinateData.chain_info[selectedChain].name}</span>
            ) : (
              <span>Showing all validators</span>
            )}
          </div>
        </div>

        <ResponsiveContainer width="100%" height="90%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                            // 이전 데이터의 실제 화면상 위치 계산
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
                        return (
                          <animated.circle
                            cx={springProps.cx}
                            cy={springProps.cy}
                            r={isSelected ? 8 : 5}
                            fill={fill}
                            stroke={isSelected ? "#3B82F6" : "none"}
                            strokeWidth={isSelected ? 3 : 0}
                            style={{ opacity: springProps.opacity }}
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
  );
};