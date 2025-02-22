// src/components/chain/ChainSection.tsx
import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ClusterButton } from './ClusterButton';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { selectChain } from '../../store/slices/chainSlice';
import { ClusterType, CoordinateData, ValidatorData } from '../../types';
import { CLUSTER_COLORS, CLUSTER_LABELS } from '../../constants';
import { setChainProposals } from '../../store/slices/proposalSlice';
import { setSelectedClusters } from '../../store/slices/chainSlice';

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

const ChainInfo = ({ 
  chainData, 
  proposalCount 
}: { 
  chainData: any, 
  proposalCount: number 
}) => (
  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
    <div className="flex items-center gap-3">
      <img 
        src={loadChainLogo(chainData.name)}
        alt={`${chainData.name} logo`}
        className="w-8 h-8 object-contain"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <h3 className="font-semibold mb-2">
        {chainData.name}
      </h3>
    </div>
    <div className="space-y-2">
      <p>Total Validators: {chainData.validators_count}</p>
      <p>Total Proposals: {proposalCount}</p>
      <div className="space-y-1 mt-2">
        {Object.entries(chainData.cluster_distribution as Record<string, number>)
          .map(([clusterStr, count]) => {
            const cluster = Number(clusterStr) as ClusterType;
            return (
              <div 
                key={cluster}
                className="text-sm flex justify-between"
                style={{ color: CLUSTER_COLORS[cluster] }}
              >
                <span>{CLUSTER_LABELS[cluster]}:</span>
                <span>{count}</span>
              </div>
            );
          })}
      </div>
    </div>
  </div>
);

const ChainListItem = ({ 
  chainId, 
  info, 
  isSelected, 
  isValidatorChain,
  maxValidators,
  selectedClusters,
  onClick 
}: { 
  chainId: string;
  info: any;
  isSelected: boolean;
  isValidatorChain: boolean;
  maxValidators: number;
  selectedClusters: number[];
  onClick: () => void;
}) => {
  return (
    <div
      className={`
        group flex flex-col
        p-2 rounded-lg cursor-pointer 
        transition-all duration-200 hover:bg-gray-50
        ${isSelected ? 'ring-2 ring-indigo-500 shadow-sm' : ''}
        ${isValidatorChain ? 'bg-blue-50' : ''}
        ${isSelected && isValidatorChain ? 'ring-2 ring-indigo-500 bg-blue-50 shadow-md' : ''}
      `}
      onClick={onClick}
    >
      {/* 체인명 - 기본적으로는 숨겨져 있다가 hover 시 표시 */}
      <div className="
        overflow-hidden
        transition-[height] duration-200 ease-in-out
        h-0 group-hover:h-6
        opacity-0 group-hover:opacity-100
      ">
        <span className="font-medium">{info.name}</span>
      </div>

      {/* 기본 표시 내용 - 아이콘과 차트 */}
      <div className="
        flex items-center w-full
        transition-[margin] duration-200 ease-in-out
        group-hover:mt-2
      ">
        <div className="shrink-0">
          <img 
            src={loadChainLogo(info.name)}
            alt={`${info.name} logo`}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex-1 ml-2">
          <ResponsiveContainer width="100%" height={20}>
            <BarChart 
              data={[{ ...info.cluster_distribution }]} 
              layout="vertical"
              margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
            >
              <XAxis type="number" hide domain={[0, maxValidators]} />
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

      {/* 군집 숫자 - 스택 바 차트와 정렬 맞추기 */}
      <div className="
        overflow-hidden
        transition-[height,margin] duration-200 ease-in-out
        h-0 group-hover:h-6
        mt-0 group-hover:mt-2
      ">
        <div className="flex items-center gap-2 ml-8">
          {CLUSTERS.map((cluster) => (
            (selectedClusters.length === 0 || selectedClusters.includes(cluster)) && (
              <span 
                key={cluster}
                style={{ color: CLUSTER_COLORS[cluster] }}
                className="font-medium"
              >
                {info.cluster_distribution[cluster]}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export const ChainSection = () => {
  const dispatch = useAppDispatch();
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const chainProposals = useAppSelector(state => state.proposal.chainProposals);
  
  // validatorChainMap을 props로 받거나 context로 관리하도록 수정
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());

  // validatorChains 계산
  const validatorChains = useMemo(() => {
    if (!selectedValidator) return [];
    return Array.from(validatorChainMap.get(selectedValidator.voter) || []);
  }, [selectedValidator, validatorChainMap]);

  // 모든 체인의 validator 수 중 최대값 계산
  const maxValidators = useMemo(() => {
    if (!coordinateData) return 0;
    return Math.max(
      ...Object.values(coordinateData.chain_info).map(info => info.validators_count)
    );
  }, [coordinateData]);

  // 체인 데이터 메모이제이션
  // const memoizedChainData = useMemo(() => {
  //   if (!coordinateData) return null;
  //   return Object.entries(coordinateData.chain_info).map(([chainId, info]) => ({
  //     chainId,
  //     info,
  //     validatorCount: info.validators_count,
  //     percentage: (info.validators_count / maxValidators) * 100
  //   }));
  // }, [coordinateData, maxValidators]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 좌표 데이터 로드
        const response = await fetch('/data/coordinates/coordinates.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: CoordinateData = await response.json();
        setCoordinateData(data);

        // validatorChainMap 생성
        const mapping = new Map<string, Set<string>>();
        Object.entries(data.chain_coords_dict).forEach(([chainId, validators]) => {
          validators.forEach((validator: ValidatorData) => {
            const chainSet = mapping.get(validator.voter) || new Set<string>();
            chainSet.add(chainId);
            mapping.set(validator.voter, chainSet);
          });
        });
        setValidatorChainMap(mapping);

        // 프로포절 데이터 로드 경로 수정
        try {
          const proposalsResponse = await fetch('/data/analysis/proposal_analysis/chain_proposals.json');
          if (proposalsResponse.ok) {
            const proposalsData = await proposalsResponse.json();
            dispatch(setChainProposals(proposalsData));
          } else {
            console.error('Failed to load proposal data:', proposalsResponse.status);
          }
        } catch (error) {
          console.error('Error loading proposal data:', error);
        }
      } catch (error) {
        console.error('Error loading chain data:', error);
      }
    };
    loadData();
  }, [dispatch]);

  if (!coordinateData) return <div>Loading...</div>;

  const handleChainClick = (chainId: string) => {
    dispatch(selectChain(chainId === selectedChain ? null : chainId));
  };

  const handleClusterClick = (cluster: ClusterType) => {
    // 클러스터 선택 로직 구현
    const newSelectedClusters = selectedClusters.includes(cluster)
      ? selectedClusters.filter(c => c !== cluster)
      : [...selectedClusters, cluster];
    dispatch(setSelectedClusters(newSelectedClusters));
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      {/* 상단 Chains 제목과 클러스터 버튼 */}
      <div className="flex-none">
        <h2 className="text-xl font-semibold">Chains</h2>
        {/* 클러스터 버튼과 레이블을 위한 고정 높이 컨테이너 */}
        <div className="h-20 mt-2">  {/* 버튼과 레이블을 위한 충분한 높이 확보 */}
          <div className="flex justify-between px-4 lg:px-2">
            {CLUSTERS.map((cluster) => (
              <ClusterButton
                key={cluster}
                cluster={cluster}
                isSelected={selectedClusters.includes(cluster)}
                onClick={() => handleClusterClick(cluster)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 체인 리스트 컨테이너 */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="space-y-1 px-2 py-2">
          {Object.entries(coordinateData.chain_info).map(([chainId, info]) => (
            <ChainListItem
              key={chainId}
              chainId={chainId}
              info={info}
              isSelected={selectedChain === chainId}
              isValidatorChain={selectedValidator ? validatorChains.includes(chainId) : false}
              maxValidators={maxValidators}
              selectedClusters={selectedClusters}
              onClick={() => handleChainClick(chainId)}
            />
          ))}
        </div>
      </div>

      {/* 선택된 체인 정보 섹션 */}
      {selectedChain && coordinateData.chain_info[selectedChain] && (
        <ChainInfo 
          chainData={{
            ...coordinateData.chain_info[selectedChain],
            chainId: selectedChain
          }} 
          proposalCount={Object.keys(chainProposals[selectedChain]?.proposals || {}).length}
        />
      )}
    </div>
  );
};