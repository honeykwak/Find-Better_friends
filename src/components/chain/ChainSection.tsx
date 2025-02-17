// src/components/chain/ChainSection.tsx
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ClusterButton } from './ClusterButton';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { selectChain } from '../../store/slices/chainSlice';
import { ClusterType, CoordinateData, ValidatorData, ChainProposals } from '../../types';
import { CLUSTER_COLORS, CLUSTER_LABELS } from '../../constants';

const CLUSTERS: readonly ClusterType[] = [1, 2, 3, 4, 5];

// 체인 로고를 로드하는 함수 추가
const loadChainLogo = (chainName: string): string | undefined => {
  try {
    // 체인 이름을 소문자로 변환
    const normalizedName = chainName.toLowerCase();
    // 이미지 경로 생성
    return `/chain-logos/${normalizedName}.png`;
  } catch (error) {
    console.error('Error loading chain logo:', error);
    return undefined;
  }
};

export const ChainSection = () => {
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const [chainProposals, setChainProposals] = useState<ChainProposals | null>(null);
  const dispatch = useAppDispatch();
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  
  // validatorChainMap을 props로 받거나 context로 관리하도록 수정
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    const loadData = async () => {
      try {
        const coordResponse = await fetch('/data/coordinates/coordinates.json');
        const coordData: CoordinateData = await coordResponse.json();
        setCoordinateData(coordData);
        
        const proposalsResponse = await fetch('/data/analysis/chain_proposals.json');
        const proposalsData: ChainProposals = await proposalsResponse.json();
        setChainProposals(proposalsData);

        // validatorChainMap 생성
        const mapping = new Map<string, Set<string>>();
        Object.entries(coordData.chain_coords_dict).forEach(([chainId, validators]) => {
          validators.forEach((validator: ValidatorData) => {
            const chainSet = mapping.get(validator.voter) || new Set<string>();
            chainSet.add(chainId);
            mapping.set(validator.voter, chainSet);
          });
        });
        setValidatorChainMap(mapping);
      } catch (error) {
        console.error('Error loading chain data:', error);
      }
    };
    loadData();
  }, []);

  // validatorChains 계산
  const validatorChains = useMemo(() => {
    if (!selectedValidator) return [];
    return Array.from(validatorChainMap.get(selectedValidator.voter) || []);
  }, [selectedValidator, validatorChainMap]);

  if (!coordinateData) return <div>Loading...</div>;

  // 모든 체인의 validator 수 중 최대값 계산
  const maxValidators = Math.max(
    ...Object.values(coordinateData.chain_info).map(info => info.validators_count)
  );

  const handleChainClick = (chainId: string) => {
    dispatch(selectChain(chainId === selectedChain ? null : chainId));
  };

  return (
    <div className="space-y-4">
      {/* Clusters 제목 */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Clusters</h2>
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {CLUSTERS.map((cluster) => (
            <ClusterButton 
              key={cluster}
              cluster={cluster}
              label={CLUSTER_LABELS[cluster]}
            />
          ))}
        </div>
      </div>

      {/* Chains 섹션 */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Chains</h2>
        {Object.entries(coordinateData.chain_info).map(([chainId, info]) => (
          <div
            key={chainId}
            className={`
              flex items-center p-4 rounded-lg cursor-pointer 
              transition-all duration-200 hover:bg-gray-50
              ${selectedChain === chainId 
                ? 'ring-2 ring-indigo-500 shadow-sm'
                : ''
              }
              ${selectedValidator && validatorChains.includes(chainId)
                ? 'bg-blue-50'
                : ''
              }
              ${selectedChain === chainId && selectedValidator && validatorChains.includes(chainId)
                ? 'ring-2 ring-indigo-500 bg-blue-50 shadow-md'
                : ''
              }
            `}
            onClick={() => handleChainClick(chainId)}
          >
            <div className="w-1/4 font-medium flex items-center gap-2">
              <img 
                src={loadChainLogo(info.name)}
                alt={`${info.name} logo`}
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {info.name}
            </div>
            <div className="w-3/4 h-8 ml-4">
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
                    domain={[0, maxValidators]}
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

      {/* 선택된 체인 정보 섹션 */}
      {selectedChain && coordinateData.chain_info[selectedChain] && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <img 
              src={loadChainLogo(coordinateData.chain_info[selectedChain].name)}
              alt={`${coordinateData.chain_info[selectedChain].name} logo`}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h3 className="font-semibold mb-2">
              {coordinateData.chain_info[selectedChain].name}
            </h3>
          </div>
          <div className="space-y-2">
            <p>Total Validators: {coordinateData.chain_info[selectedChain].validators_count}</p>
            <p>Total Proposals: {chainProposals?.[selectedChain] || 0}</p>
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
        </div>
      )}
    </div>
  );
};