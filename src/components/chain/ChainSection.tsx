// src/components/chain/ChainSection.tsx
import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ClusterButton } from './ClusterButton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { selectChain } from '../../store/slices/chainSlice';
import { ClusterType, CoordinateData } from '../../types';
import { CLUSTER_COLORS, CLUSTER_LABELS, SELECTED_BACKGROUND } from '../../constants';

const CLUSTERS: readonly ClusterType[] = [1, 2, 3, 4, 5];

export const ChainSection = () => {
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const dispatch = useAppDispatch();
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/src/data/coordinates/coordinates.json');
        const data: CoordinateData = await response.json();
        setCoordinateData(data);
      } catch (error) {
        console.error('Error loading chain data:', error);
      }
    };
    loadData();
  }, []);

  if (!coordinateData) return <div>Loading...</div>;

  const handleChainClick = (chainId: string) => {
    dispatch(selectChain(chainId === selectedChain ? null : chainId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 mb-6">
        <h2 className="text-xl font-semibold">Clusters</h2>
        <div className="flex gap-2">
          {CLUSTERS.map((cluster) => (
            <ClusterButton 
              key={cluster}
              cluster={cluster}
              label={CLUSTER_LABELS[cluster]}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Chains</h2>
        {Object.entries(coordinateData.chain_info).map(([chainId, info]) => (
          <div
            key={chainId}
            className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
              selectedChain === chainId ? `bg-[${SELECTED_BACKGROUND}]` : ''
            }`}
            onClick={() => handleChainClick(chainId)}
          >
            <div className="w-1/4 font-medium">{info.name}</div>
            <div className="w-3/4 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[{ 
                    ...info.cluster_distribution,
                    name: info.name,
                    chainId,
                    totalValidators: info.validators_count
                  }]} 
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis 
                    type="number" 
                    hide 
                    domain={[0, 'dataMax']}
                  />
                  <YAxis type="category" hide />
                  {CLUSTERS.map((cluster) => (
                    selectedClusters.length === 0 || selectedClusters.includes(cluster) ? (
                      <Bar
                        key={cluster}
                        dataKey={cluster.toString()}
                        stackId="a"
                        fill={CLUSTER_COLORS[cluster]}
                      />
                    ) : null
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {selectedChain && coordinateData.chain_info[selectedChain] && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">{coordinateData.chain_info[selectedChain].name}</h3>
          <p>Total Validators: {coordinateData.chain_info[selectedChain].validators_count}</p>
          <div className="grid grid-cols-5 gap-4 mt-2">
            {Object.entries(coordinateData.chain_info[selectedChain].cluster_distribution)
              .map(([clusterStr, count]) => {
                const cluster = Number(clusterStr) as ClusterType;
                return (
                  <div 
                    key={cluster}
                    className="text-sm"
                    style={{ color: CLUSTER_COLORS[cluster] }}
                  >
                    {CLUSTER_LABELS[cluster]}: {count}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};