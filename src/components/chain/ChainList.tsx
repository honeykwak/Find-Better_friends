import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ClusterType, CoordinateData } from '../../types';
import { CLUSTER_COLORS } from '../../constants';
import { selectChain, updateValidatorSelection } from '../../store/slices/chainSlice';

export const ChainList: React.FC = () => {
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const validatorChains = useAppSelector(state => state.chain.validatorChains);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/src/data/coordinates/coordinates.json');
        const data: CoordinateData = await response.json();
        setCoordinateData(data);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();
  }, []);

  if (!coordinateData) return null;

  const handleChainSelect = (chainId: string) => {
    dispatch(selectChain(chainId === selectedChain ? null : chainId));
  };

  const chartData = Object.entries(coordinateData.chain_info).map(([chainId, info]) => {
    const total = info.validators_count;
    return {
      chainId,
      name: info.name,
      totalValidators: total,
      ...Object.entries(info.cluster_distribution).reduce((acc, [cluster, count]) => ({
        ...acc,
        [cluster]: count
      }), {})
    };
  });

  const clusters: ClusterType[] = [1, 2, 3, 4, 5];

  return (
    <div className="w-full space-y-4">
      {chartData.map((chain) => {
        const isValidatorChain = validatorChains.has(chain.chainId);
        
        return (
          <div 
            key={chain.chainId}
            className={`flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors
              ${selectedChain === chain.chainId ? 'bg-[#DCDFFF]' : ''}
              ${isValidatorChain ? 'ring-2 ring-blue-500' : ''}
            `}
            onClick={() => handleChainSelect(chain.chainId)}
          >
            <div className="w-1/4 font-medium">
              {chain.name}
              {isValidatorChain && (
                <span className="ml-2 text-xs text-blue-600">
                  (Selected validator active)
                </span>
              )}
            </div>
            <div className="w-3/4 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={[chain]} 
                  layout="vertical"
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis 
                    type="number" 
                    hide 
                    domain={[0, Math.max(...chartData.map(d => d.totalValidators))]}
                  />
                  <YAxis type="category" hide />
                  {clusters.map((cluster) => (
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
        );
      })}
    </div>
  );
};