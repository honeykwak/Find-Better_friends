import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ClusterType, CoordinateData, ValidatorData } from '../../types';
import { CLUSTER_COLORS } from '../../constants';
import { ValidatorInfo } from './ValidatorInfo';

const CLUSTERS: readonly ClusterType[] = [1, 2, 3, 4, 5];
const ANIMATION_DURATION = 500;
const BATCH_SIZE = 50;
const STAGGER_DELAY = 20;

interface EnhancedValidatorData extends ValidatorData {
  isAnimated?: boolean;
  animationBegin?: number;
}

export const ValidatorOverview = () => {
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousValidators, setPreviousValidators] = useState<Set<string>>(new Set());
  const [selectedValidator, setSelectedValidator] = useState<ValidatorData | null>(null);
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());
  
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);

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
    if (selectedValidator && selectedChain) {
      const validatorChains = validatorChainMap.get(selectedValidator.voter);
      if (!validatorChains?.has(selectedChain)) {
        setSelectedValidator(null);
      }
    }
  }, [selectedChain, selectedValidator, validatorChainMap]);

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

      return processedData;
    } catch (error) {
      console.error('Error processing display data:', error);
      return [];
    }
  }, [coordinateData, selectedChain]);

  const filteredData = useMemo(() => {
    return displayData.filter(d => 
      selectedClusters.length === 0 || selectedClusters.includes(d.cluster)
    );
  }, [displayData, selectedClusters]);

  const chartBounds = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        xExtent: [-10, 10],
        yExtent: [-10, 10],
        xPadding: 1,
        yPadding: 1
      };
    }

    const xExtent = [
      Math.min(...filteredData.map(d => d.x)),
      Math.max(...filteredData.map(d => d.x))
    ];
    const yExtent = [
      Math.min(...filteredData.map(d => d.y)),
      Math.max(...filteredData.map(d => d.y))
    ];

    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

    return { xExtent, yExtent, xPadding, yPadding };
  }, [filteredData]);

  const getBatchedClusterData = useCallback((clusterData: EnhancedValidatorData[]) => {
    const batches = Array.from({ length: Math.ceil(clusterData.length / BATCH_SIZE) }, (_, i) => 
      clusterData.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );

    return { batches };
  }, []);

  const handleClick = useCallback((data: any) => {
    if (data && data.payload) {
      const validator = data.payload;
      setSelectedValidator(prev => 
        prev?.voter === validator.voter ? null : validator
      );
    }
  }, []);

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
              domain={[chartBounds.xExtent[0] - chartBounds.xPadding, chartBounds.xExtent[1] + chartBounds.xPadding]}
              hide={true}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={[chartBounds.yExtent[0] - chartBounds.yPadding, chartBounds.yExtent[1] + chartBounds.yPadding]}
              hide={true}
            />
            <ZAxis type="number" range={[50]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload || !payload[0]) return null;
                const data = payload[0].payload as ValidatorData;
                return (
                  <div className="bg-white p-3 border rounded shadow">
                    <p className="font-medium">{data.voter}</p>
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
                      shape="circle"
                      isAnimationActive={true}
                      animationDuration={ANIMATION_DURATION}
                      animationBegin={batchIndex * STAGGER_DELAY}
                      onClick={handleClick}
                      cursor="pointer"
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <ValidatorInfo 
        validator={selectedValidator}
        validatorChains={selectedValidator ? Array.from(validatorChainMap.get(selectedValidator.voter) || []) : []}
      />
    </div>
  );
};