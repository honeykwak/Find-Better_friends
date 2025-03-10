import { useMemo, useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ValidatorVotingPattern, ProposalData, ValidatorData, ClusterType } from '../../types';
import { setCoordinateData } from '../../store/slices/chainSlice';
import { setSelectedValidator, setAdditionalValidator } from '../../store/slices/validatorSlice';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { selectSelectedProposalsByChain } from '../../store/selectors';
import { useChainMap } from '../../hooks/useChainMap';

// SortField 타입을 keyof TableValidator로 수정
type SortFieldValue = keyof TableValidator;

interface SortDirection {
  value: 'asc' | 'desc';
  label: string;
}

// 투표 옵션 타입 정의
// type VoteOption = 'YES' | 'NO' | 'ABSTAIN' | 'NO_WITH_VETO' | 'NO_VOTE';

interface ValidatorDetailsProps {
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
  no: number | string;
  validator: string;
  cluster: ClusterType;
  participationRate: string;
  proposalMatchRate: string;
  overallMatchRate: string;
  clusterMatchRate: string;
  participatedInLatest: boolean;
}

export const ValidatorDetails: React.FC<ValidatorDetailsProps> = ({
  proposalData,
  validatorName
}) => {
  const dispatch = useAppDispatch();
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const coordinateData = useAppSelector(state => state.chain.coordinateData);
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const votingPatterns = useAppSelector(state => state.votingPatterns.patternsByChain[selectedChain || '']);
  const activeFilters = useAppSelector(state => state.filter.activeFilters);
  const validatorChainMap = useChainMap();
  const [showRecentParticipants, setShowRecentParticipants] = useState(false);
  const [sortField, setSortField] = useState<SortFieldValue>('validator');
  const [sortDirection, setSortDirection] = useState<SortDirection['value']>('asc');
  
  // isLoading state 제거 (Redux store의 상태로 대체)
  const isDataReady = !!votingPatterns && !!proposalData;

  // 메모이제이션된 셀렉터 사용
  const selectedProposals = useAppSelector(
    state => selectSelectedProposalsByChain(state, selectedChain || '')
  );

  // 가장 최근 proposal ID 찾기
  const latestProposalId = useMemo(() => {
    if (!proposalData) return null;
    return Object.keys(proposalData).reduce<string>((latest, current) => {
      if (!latest) return current;
      return parseInt(current) > parseInt(latest) ? current : latest;
    }, '');
  }, [proposalData]);

  // 디버깅 로그를 useEffect로 이동
  useEffect(() => {
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
  }, [selectedChain, validatorName, proposalData, selectedProposals.length, votingPatterns, coordinateData, selectedValidator]);

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

  const handleSort = (field: SortFieldValue) => {
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

  // additionalValidator 추가
  const additionalValidator = useAppSelector(state => state.validator.additionalValidator);

  const validators = useMemo(() => {
    if (!coordinateData?.chain_coords_dict?.[selectedChain || ''] || !isDataReady || !votingPatterns) {
      return [];
    }

    const chainValidators = coordinateData.chain_coords_dict[selectedChain || ''];
    // 선택된 proposals이 없으면 모든 proposals 사용
    const proposalIds = memoizedSelectedProposals.length > 0 
      ? memoizedSelectedProposals 
      : Object.keys(proposalData || {});
    
    let validatorList = chainValidators.map((validator: ValidatorData): TableValidator => {
      const currentValidatorVotes = votingPatterns[validator.voter]?.proposal_votes || {};
      
      // Participation Rate 계산 - NO_VOTE를 포함한 모든 투표를 카운트
      const participatedProposals = proposalIds.filter(id => {
        const vote = currentValidatorVotes[id]?.option;
        return vote !== undefined;
      });
      
      const participationRate = proposalIds.length > 0
        ? (participatedProposals.length / proposalIds.length * 100).toFixed(1) + '%'
        : '-';

      // Proposal Match Rate와 Overall Match Rate 계산 부분 수정
      const selectedValidatorVotes = votingPatterns[selectedValidator?.voter || '']?.proposal_votes || {};

      // Proposal Match Rate 계산 수정
      let matchCount = 0;
      let totalVotes = 0;

      proposalIds.forEach(id => {
        const selectedVote = selectedValidatorVotes[id]?.option;
        
        // 기준 validator가 투표한 경우에만 계산
        if (selectedVote !== undefined) {
          const currentVote = currentValidatorVotes[id]?.option;
          
          // 비교 대상 validator도 해당 proposal에 투표했고, 투표가 일치하는 경우
          if (currentVote !== undefined && selectedVote === currentVote) {
            matchCount++;
          }
          
          // 기준 validator가 투표한 모든 proposal 카운트
          totalVotes++;
        }
      });

      const proposalMatchRate = totalVotes > 0
        ? (matchCount / totalVotes * 100).toFixed(1) + '%'
        : '-';

      // Overall Match Rate 계산 (전체 proposal에 대해)
      let overallMatchCount = 0;

      proposalIds.forEach(id => {
        const selectedVote = selectedValidatorVotes[id]?.option;
        const currentVote = currentValidatorVotes[id]?.option;
        
        // NO_VOTE도 하나의 투표 옵션으로 간주
        const effectiveSelectedVote = selectedVote || 'NO_VOTE';
        const effectiveCurrentVote = currentVote || 'NO_VOTE';
        
        if (effectiveSelectedVote === effectiveCurrentVote) {
          overallMatchCount++;
        }
      });

      const overallMatchRate = proposalIds.length > 0
        ? (overallMatchCount / proposalIds.length * 100).toFixed(1) + '%'
        : '-';

      // Cluster Match Rate 계산
      const sameClusterValidators = chainValidators
        .filter(v => v.cluster === validator.cluster && v.voter !== validator.voter);
      
      let clusterMatchCount = 0;
      let clusterTotalVotes = 0;

      sameClusterValidators.forEach(clusterValidator => {
        const clusterValidatorVotes = votingPatterns[clusterValidator.voter]?.proposal_votes || {};
        
        proposalIds.forEach(id => {
          const currentVote = currentValidatorVotes[id]?.option;
          const clusterValidatorVote = clusterValidatorVotes[id]?.option;
          
          if (currentVote !== undefined && clusterValidatorVote !== undefined) {
            if (currentVote === clusterValidatorVote) {
              clusterMatchCount++;
            }
            clusterTotalVotes++;
          }
        });
      });

      const clusterMatchRate = clusterTotalVotes > 0
        ? (clusterMatchCount / clusterTotalVotes * 100).toFixed(1) + '%'
        : '-';

      // 가장 최근 proposal 참여 여부 확인
      const participatedInLatest = latestProposalId 
        ? currentValidatorVotes[latestProposalId]?.option !== undefined
        : true;

      return {
        no: 0,
        validator: validator.voter,
        cluster: validator.cluster,
        participationRate,
        proposalMatchRate,
        overallMatchRate,
        clusterMatchRate,
        participatedInLatest
      };
    });

    // 필터링 적용
    if (showRecentParticipants && latestProposalId) {
      validatorList = validatorList.filter(v => v.participatedInLatest);
    }

    validatorList.sort((a, b) => {
      // 1. Primary validator와 Additional validator를 최상단에 배치
      if (selectedValidator || additionalValidator) {
        if (a.validator === selectedValidator?.voter) return -1;
        if (b.validator === selectedValidator?.voter) return 1;
        if (a.validator === additionalValidator?.voter) return -1;
        if (b.validator === additionalValidator?.voter) return 1;
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
      } else if (sortField === 'no') {
        comparison = (aValue as number) - (bValue as number);
      } else if (sortField === 'participatedInLatest') {
        comparison = (aValue === bValue) ? 0 : aValue ? -1 : 1;
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
      no: selectedValidator?.voter === v.validator 
        ? 'P'  // Primary validator는 'P'
        : additionalValidator?.voter === v.validator
          ? 'C'  // Compare validator는 'C'
          : counter++
    }));
  }, [
    selectedChain,
    coordinateData,
    proposalData,
    votingPatterns,
    isDataReady,
    memoizedSelectedProposals,
    selectedValidator,
    sortField,
    sortDirection,
    activeFilters,
    getRowStyle,
    validatorChainMap,
    showRecentParticipants,
    latestProposalId,
    additionalValidator
  ]);

  const SortIcon = ({ field }: { field: SortFieldValue }) => {
    if (sortField !== field) return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  };

  const renderHeader = (field: SortFieldValue, label: string) => (
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

  // tr 클릭 핸들러 추가
  const handleRowClick = (validator: TableValidator) => {
    if (!selectedValidator) {
      // 선택된 validator가 없으면 primary로 설정
      dispatch(setSelectedValidator({
        voter: validator.validator,
        cluster: validator.cluster
      } as ValidatorData));
    } else if (selectedValidator.voter === validator.validator) {
      // 이미 선택된 validator를 다시 클릭하면 선택 해제
      dispatch(setSelectedValidator(null));
    } else {
      // 다른 validator를 클릭하면 additional validator로 설정
      dispatch(setAdditionalValidator({
        voter: validator.validator,
        cluster: validator.cluster
      } as ValidatorData));
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <div className="flex-none flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Validator Details</h2>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="recentParticipants"
            checked={showRecentParticipants}
            onChange={(e) => setShowRecentParticipants(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="recentParticipants" className="text-sm text-gray-600">
            Show only latest proposal participants
          </label>
        </div>
      </div>
      {!isDataReady ? (
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
                    hover:bg-gray-50 transition-colors cursor-pointer
                    ${selectedValidator?.voter === validator.validator ? 'bg-blue-50' : ''}
                    ${additionalValidator?.voter === validator.validator ? 'bg-green-50' : ''}
                  `}
                  onClick={() => handleRowClick(validator)}
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