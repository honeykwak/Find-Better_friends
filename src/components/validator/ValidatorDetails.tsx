import { useMemo, useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ValidatorVotingPattern, ProposalData, ValidatorData, ClusterType } from '../../types';
import { setCoordinateData } from '../../store/slices/chainSlice';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { selectSelectedProposalsByChain } from '../../store/selectors';
import { useChainMap } from '../../hooks/useChainMap';

type SortField = 'validator' | 'participationRate' | 'proposalMatchRate' | 'overallMatchRate' | 'clusterMatchRate' | 'cluster';
type SortDirection = 'asc' | 'desc';

// 투표 옵션 타입 정의
// type VoteOption = 'YES' | 'NO' | 'ABSTAIN' | 'NO_WITH_VETO' | 'NO_VOTE';

interface ValidatorDetailsProps {
  votingPattern?: ValidatorVotingPattern | null;
  proposalData: { [proposalId: string]: ProposalData } | null;
  validatorName: string;
}

interface VotingPatternsData {
  [validator: string]: {
    proposal_votes: {
      [proposalId: string]: {
        option: 'YES' | 'NO' | 'NO_WITH_VETO' | 'ABSTAIN' | 'NO_VOTE';
        votingPower: number;
      };
    };
  };
}

interface TableValidator {
  no: number;
  validator: string;
  cluster: ClusterType;
  participationRate: string;
  proposalMatchRate: string;
  overallMatchRate: string;
  clusterMatchRate: string;
}

export const ValidatorDetails: React.FC<ValidatorDetailsProps> = ({
  proposalData,
  validatorName
}) => {
  const dispatch = useAppDispatch();
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const coordinateData = useAppSelector(state => state.chain.coordinateData);
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const [votingPatterns, setVotingPatterns] = useState<VotingPatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const activeFilters = useAppSelector(state => state.filter.activeFilters);
  const validatorChainMap = useChainMap();

  // 메모이제이션된 셀렉터 사용
  const selectedProposals = useAppSelector(
    state => selectSelectedProposalsByChain(state, selectedChain || '')
  );

  // 디버깅 로그 개선
  console.log('ValidatorDetails Debug:', {
    selectedChain,
    validatorName,
    hasProposalData: !!proposalData,
    proposalCount: proposalData ? Object.keys(proposalData).length : 0,
    selectedProposalCount: selectedProposals.length,
    hasVotingPatterns: !!votingPatterns,
    hasCoordinateData: !!coordinateData,
    selectedValidator: selectedValidator?.voter
  });

  const [sortField, setSortField] = useState<SortField>('validator');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 선택된 proposals 메모이제이션
  const memoizedSelectedProposals = useMemo(() => selectedProposals, [selectedProposals]);

  useEffect(() => {
    const loadCoordinateData = async () => {
      try {
        if (!coordinateData) {
          const response = await fetch('/data/coordinates/coordinates.json');
          const data = await response.json();
          dispatch(setCoordinateData(data));
        }
      } catch (error) {
        console.error('Error loading coordinate data:', error);
      }
    };

    loadCoordinateData();
  }, [coordinateData, dispatch]);

  // voting patterns 데이터 로드
  useEffect(() => {
    const loadVotingPatterns = async () => {
      if (!selectedChain) return;
      setLoading(true);
      
      try {
        const response = await fetch(`/data/analysis/voting_patterns/${selectedChain.toLowerCase()}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVotingPatterns(data);
      } catch (error) {
        console.error('Error loading voting patterns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVotingPatterns();
  }, [selectedChain]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // const sortValidators = (
  //   validators: Array<{
  //     voter: string;
  //     participationRate: string;
  //     proposalMatchRate: string;
  //     overallMatchRate: string;
  //     clusterMatchRate: string;
  //     cluster: number;
  //   }>,
  //   field: SortField,
  //   direction: SortDirection
  // ) => {
  //   return [...validators].sort((a, b) => {
  //     let comparison = 0;
      
  //     switch (field) {
  //       case 'validator':
  //         comparison = a.voter.localeCompare(b.voter);
  //         break;
  //       case 'cluster':
  //         comparison = a.cluster - b.cluster;
  //         break;
  //       default:
  //         const aValue = parseFloat(a[field].replace('%', ''));
  //         const bValue = parseFloat(b[field].replace('%', ''));
  //         comparison = aValue - bValue;
  //     }
      
  //     return direction === 'asc' ? comparison : -comparison;
  //   });
  // };

  // getRowStyle 함수 수정
  const getRowStyle = (validator: TableValidator) => {
    const { cluster, chains } = activeFilters;
    
    // 필터가 없으면 기본 스타일
    if (!cluster && !chains) return {};

    let matches = true;

    // 클러스터 필터 체크
    if (cluster !== undefined) {
      matches = matches && validator.cluster === cluster;
    }

    // 체인 필터 체크 - 완전히 동일한 체인 집합을 가진 경우만 매칭
    if (chains !== undefined) {
      const selectedValidatorChains = validatorChainMap.get(chains);
      const currentValidatorChains = validatorChainMap.get(validator.validator);
      
      if (!selectedValidatorChains || !currentValidatorChains) {
        matches = false;
      } else {
        // 두 Set의 크기가 같고, 모든 원소가 동일한지 확인
        matches = matches && 
          selectedValidatorChains.size === currentValidatorChains.size &&
          Array.from(selectedValidatorChains).every(chain => 
            currentValidatorChains.has(chain)
          );
      }
    }

    // 모든 활성화된 필터 조건을 만족하지 않으면 흐리게 표시
    return matches ? {} : { opacity: 0.5 };
  };

  const validators = useMemo(() => {
    if (!coordinateData?.chain_coords_dict?.[selectedChain || ''] || loading || !votingPatterns) {
      return [];
    }

    const chainValidators = coordinateData.chain_coords_dict[selectedChain || ''];
    const proposalIds = memoizedSelectedProposals;
    
    let validatorList = chainValidators.map((validator: ValidatorData): TableValidator => {
      const currentValidatorVotes = votingPatterns[validator.voter]?.proposal_votes || {};
      
      // Participation Rate 계산 - NO_VOTE를 포함한 모든 투표를 카운트
      const participatedProposals = proposalIds.filter(id => {
        const vote = currentValidatorVotes[id]?.option;
        // 모든 투표 옵션을 포함 (NO_VOTE 포함)
        return vote !== undefined;
      });
      
      const participationRate = proposalIds.length > 0
        ? (participatedProposals.length / proposalIds.length * 100).toFixed(1) + '%'
        : '-';

      // Proposal Match Rate 계산 - 참여한 프로포절에 대해서만
      let matchCount = 0;
      participatedProposals.forEach(id => {
        const proposal = proposalData?.[id];
        if (proposal) {
          const vote = currentValidatorVotes[id]?.option;
          const isMatch = (
            (proposal.status === 'PASSED' && vote === 'YES') ||
            (proposal.status === 'REJECTED' && ['NO', 'NO_WITH_VETO'].includes(vote))
          );
          if (isMatch) matchCount++;
        }
      });

      const proposalMatchRate = participatedProposals.length > 0
        ? (matchCount / participatedProposals.length * 100).toFixed(1) + '%'
        : '-';

      // Overall Match Rate 계산 - 전체 프로포절에 대해
      const overallMatchRate = proposalIds.length > 0
        ? (matchCount / proposalIds.length * 100).toFixed(1) + '%'
        : '-';

      // Cluster Match Rate 계산
      const sameClusterValidators = chainValidators
        .filter(v => v.cluster === validator.cluster && v.voter !== validator.voter);
      
      let clusterMatchCount = 0;
      let totalClusterVotes = 0;

      proposalIds.forEach(id => {
        const validatorVote = currentValidatorVotes[id]?.option;
        if (validatorVote && validatorVote !== 'NO_VOTE') {
          sameClusterValidators.forEach(clusterValidator => {
            const clusterValidatorVotes = votingPatterns[clusterValidator.voter]?.proposal_votes || {};
            const clusterVote = clusterValidatorVotes[id]?.option;
            if (clusterVote && clusterVote !== 'NO_VOTE') {
              if (clusterVote === validatorVote) {
                clusterMatchCount++;
              }
              totalClusterVotes++;
            }
          });
        }
      });

      const clusterMatchRate = totalClusterVotes > 0
        ? (clusterMatchCount / totalClusterVotes * 100).toFixed(1) + '%'
        : '-';

      return {
        no: 0,
        validator: validator.voter,
        cluster: validator.cluster,
        participationRate,
        proposalMatchRate,
        overallMatchRate,
        clusterMatchRate
      };
    });

    validatorList.sort((a, b) => {
      // 1. 선택된 validator가 있다면 최상단
      if (selectedValidator) {
        if (a.validator === selectedValidator.voter) return -1;
        if (b.validator === selectedValidator.voter) return 1;
      }

      // 2. 활성화된 필터에 따른 정렬
      const aMatches = getRowStyle(a).opacity === undefined;
      const bMatches = getRowStyle(b).opacity === undefined;
      if (aMatches !== bMatches) {
        return aMatches ? -1 : 1;
      }

      // 3. 기존 정렬 로직
      const aValue = a[sortField];
      const bValue = b[sortField];

      let comparison = 0;
      if (sortField === 'validator') {
        comparison = (aValue as string).localeCompare(bValue as string);
      } else if (sortField === 'cluster') {
        comparison = (aValue as number) - (bValue as number);
      } else {
        const parsePercentage = (value: string) => {
          if (value === '-') return -1;
          return parseFloat(value.replace('%', ''));
        };
        const aNum = parsePercentage(aValue as string);
        const bNum = parsePercentage(bValue as string);
        comparison = aNum - bNum;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // 번호 재할당
    let counter = 1;
    return validatorList.map(v => ({
      ...v,
      no: selectedValidator && v.validator === selectedValidator.voter 
        ? 1 
        : counter++
    }));
  }, [
    selectedChain,
    coordinateData,
    proposalData,
    votingPatterns,
    loading,
    memoizedSelectedProposals,
    selectedValidator,
    sortField,
    sortDirection,
    activeFilters,
    getRowStyle,
    validatorChainMap
  ]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  };

  const renderHeader = (field: SortField, label: string) => (
    <th 
      onClick={() => handleSort(field)}
      className="sticky top-0 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </th>
    );

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <h2 className="flex-none text-xl font-semibold mb-4">Validator Details</h2>
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p>Loading voting patterns...</p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky top-0 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-900 w-[8%]">
                  No.
                </th>
                {renderHeader('validator', 'Validator')}
                {renderHeader('participationRate', 'Participation Rate')}
                {renderHeader('proposalMatchRate', 'Proposal Match Rate')}
                {renderHeader('overallMatchRate', 'Overall Match Rate')}
                {renderHeader('clusterMatchRate', 'Cluster Match Rate')}
                {renderHeader('cluster', 'Cluster')}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {validators.map((validator) => (
                <tr 
                  key={validator.validator}
                  style={getRowStyle(validator)}
                  className={`
                    hover:bg-gray-50 transition-colors
                    ${selectedValidator?.voter === validator.validator ? 'bg-blue-50' : ''}
                  `}
                >
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.no}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 truncate font-medium">
                    {validator.validator}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.participationRate}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.proposalMatchRate}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.overallMatchRate}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.clusterMatchRate}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {validator.cluster}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};