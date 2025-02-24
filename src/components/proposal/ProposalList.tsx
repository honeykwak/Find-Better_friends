import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  ProposalData,
  // isProposalData
} from '../../types';
import { setSelectedProposals, toggleProposal } from '../../store/slices/proposalSlice';
import { selectSelectedProposalsByChain } from '../../store/selectors';
import { RangeSlider } from '../common/RangeSlider';
import { TimelineChart } from './TimelineChart';
import { SearchInput } from '../common/SearchInput';
import { SearchResult } from '../../types/search';
import { VOTE_COLOR_CLASSES } from '../../constants';

interface ProposalListProps {
  chainName: string;
  proposals: {[proposalId: string]: ProposalData} | null;
}

interface ProposalItemProps {
  proposal: ProposalData;
  isSelected: boolean;
  onToggle: () => void;
}

export const ProposalItem: React.FC<ProposalItemProps> = ({ proposal, isSelected, onToggle }) => (
  <button
    onClick={onToggle}
    className={`w-full text-left p-3 rounded-lg transition-colors ${
      isSelected ? 'bg-blue-50' : 'bg-gray-50'
    }`}
  >
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <div className="font-medium">{proposal.title}</div>
        <div className="text-sm text-gray-600">
          {proposal.main_category} - {proposal.sub_category}
        </div>
      </div>
      <div className={`
        ml-2 px-2 py-1 text-sm rounded
        ${proposal.status === 'PASSED' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
        }
      `}>
        {proposal.status}
      </div>
    </div>
  </button>
);

// 정렬 옵션 타입 추가
type SortOption = 'latest' | 'type' | 'competitiveness';

// 검색 타입 정의 추가 (파일 상단)
type SearchType = 'ALL' | 'TITLE' | 'DESCRIPTION' | 'TYPE';

// 검색 타입 옵션 정의 추가 (SORT_OPTIONS 근처)
const SEARCH_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'TITLE', label: 'Proposal Title' },
  { value: 'DESCRIPTION', label: 'Description' },
  { value: 'TYPE', label: 'Proposal Type' }
] as const;

// Add near the top of the file with other type definitions
type VoteOption = 'YES' | 'NO' | 'NO_WITH_VETO' | 'ABSTAIN' | 'NO_VOTE';

// 경쟁 심화도 계산 함수
const calculateCompetitiveness = (ratios?: { [key: string]: number }) => {
  // ratios가 없거나 비어있으면 기본 스케일 반환
  if (!ratios || Object.keys(ratios).length === 0) {
    return 0.6; // 중간 크기로 설정
  }
  
  // 가장 높은 두 투표 비율 찾기
  const sortedRatios = Object.values(ratios).sort((a, b) => b - a);
  const [first, second] = sortedRatios;
  
  // first가 0이면 기본 스케일 반환
  if (!first) {
    return 0.6;
  }
  
  // 경쟁 심화도 계산 (0.5:0.5가 1, 1:0이 0이 되도록)
  const competitiveness = 1 - Math.abs((first - second) / first);
  
  // 버튼 크기에 반영할 스케일 값 반환 (0.3 ~ 0.9 범위로 매핑)
  return 0.3 + (competitiveness * 0.6);
};

export const ProposalList: React.FC<ProposalListProps> = ({ chainName, proposals }) => {
  const dispatch = useAppDispatch();
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const [votingPatterns, setVotingPatterns] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // 메모이제이션된 셀렉터 사용
  const selectedProposals = useAppSelector(
    state => selectSelectedProposalsByChain(state, chainName)
  );

  // const chainProposals = useAppSelector(
  //   state => selectChainProposals(state, chainName)
  // );

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedAll, setSelectedAll] = useState(false);

  // 검색 디바운싱 추가
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [timeRange, setTimeRange] = useState<[number, number]>([0, 0]);
  
  // proposals가 변경될 때 시간 범위 초기화
  useEffect(() => {
    if (!proposals) return;
    
    const timestamps = Object.values(proposals).map(p => p.timeVotingStart);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    setTimeRange([minTime, maxTime]);
  }, [proposals]);

  // 컴포넌트 내부에 정렬 상태 추가
  const [sortOption, setSortOption] = useState<SortOption>('latest');

  // 정렬 옵션 정의
  const SORT_OPTIONS = [
    { value: 'latest', label: 'Latest' },
    { value: 'type', label: 'Type' },
    { value: 'competitiveness', label: 'Competitiveness' }
  ] as const;

  // 컴포넌트 내부에 검색 타입 상태 추가
  const [searchType, setSearchType] = useState<SearchType>('ALL');

  // 필터링된 제안 메모이제이션 수정
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    
    const filtered = Object.entries(proposals)
      .filter(([_, proposal]) => {
        const startTime = proposal.timeVotingStart;
        return startTime >= timeRange[0] && startTime <= timeRange[1];
      })
      .filter(([_, proposal]) => {
        if (!debouncedSearchTerm) return true;
        return proposal.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      });

    // 정렬 로직
    return filtered.sort((a, b) => {
      const [idA, proposalA] = a;
      const [idB, proposalB] = b;

      switch (sortOption) {
        case 'latest':
          return Number(idB) - Number(idA);
        case 'type':
          return proposalA.type.localeCompare(proposalB.type);
        case 'competitiveness': {
          const compA = calculateCompetitiveness(proposalA.ratios);
          const compB = calculateCompetitiveness(proposalB.ratios);
          return compB - compA; // 높은 순으로 정렬
        }
        default:
          return 0;
      }
    });
  }, [proposals, timeRange, debouncedSearchTerm, sortOption]);

  // searchResults 메모이제이션 수정
  const searchResults: SearchResult<ProposalData>[] = useMemo(() => {
    if (!proposals || !debouncedSearchTerm) return [];
    
    return Object.entries(proposals)
      .filter(([_, proposal]) => {
        const searchLower = debouncedSearchTerm.toLowerCase();
        return (
          proposal.title.toLowerCase().includes(searchLower) ||
          proposal.main_category.toLowerCase().includes(searchLower) ||
          proposal.sub_category.toLowerCase().includes(searchLower) ||
          proposal.type.toLowerCase().includes(searchLower)
        );
      })
      .map(([id, proposal]) => ({
        id,
        text: proposal.title,
        data: proposal
      }));
  }, [proposals, debouncedSearchTerm]);

  const handleResultClick = (result: SearchResult<ProposalData>) => {
    dispatch(toggleProposal({ 
      chainId: chainName, 
      proposalId: result.id 
    }));
    setSearchTerm('');
    setIsSearchFocused(false);
  };

  // 검색 결과와 일치하는 proposal ID들을 추적하기 위한 상태 추가
  const [highlightedProposals, setHighlightedProposals] = useState<string[]>([]);

  // searchResults가 변경될 때마다 하이라이트할 proposal ID들 업데이트
  useEffect(() => {
    if (!isSearchFocused || !debouncedSearchTerm) {
      setHighlightedProposals([]);
      return;
    }

    const searchLower = debouncedSearchTerm.toLowerCase();
    const matchingIds = Object.entries(proposals || {})
      .filter(([_, proposal]) => (
        proposal.title.toLowerCase().includes(searchLower) ||
        proposal.main_category.toLowerCase().includes(searchLower) ||
        proposal.sub_category.toLowerCase().includes(searchLower) ||
        proposal.type.toLowerCase().includes(searchLower)
      ))
      .map(([id]) => id);

    setHighlightedProposals(matchingIds);
  }, [proposals, isSearchFocused, debouncedSearchTerm]);

  // Reset 버튼 핸들러
  const handleReset = () => {
    const newSelected = selectedAll ? [] : filteredProposals.map(([id]) => id);
    dispatch(setSelectedProposals({ 
      chainId: chainName, 
      proposalIds: newSelected 
    }));
    setSelectedAll(!selectedAll);
  };

  // 외부 클릭 시 검색 드롭다운 닫기
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

  // Voting Patterns 데이터 로드
  useEffect(() => {
    const loadVotingPatterns = async () => {
      if (!selectedValidator || !chainName) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/data/analysis/voting_patterns/${chainName}.json`);
        if (!response.ok) throw new Error('Failed to fetch voting patterns');
        const data = await response.json();
        setVotingPatterns(data);
      } catch (error) {
        console.error('Error loading voting patterns:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVotingPatterns();
  }, [selectedValidator, chainName]);

  // 투표 결과에 따른 버튼 스타일 결정
  const getVoteStyle = (proposalId: string) => {
    if (!selectedValidator || !votingPatterns || loading) {
      return 'bg-gray-50 text-gray-700 hover:bg-gray-100';
    }

    const validatorVotes = votingPatterns[selectedValidator.voter]?.proposal_votes;
    if (!validatorVotes) return 'bg-gray-50 text-gray-700';

    const vote = validatorVotes[proposalId]?.option as VoteOption;
    return VOTE_COLOR_CLASSES[vote] || 'bg-gray-50 text-gray-700';
  };

  // 슬라이더 값이 변경될 때마다 선택된 proposals 업데이트
  useEffect(() => {
    if (!proposals) return;

    // 현재 선택된 proposals 가져오기
    const currentSelectedProposals = selectedProposals;
    
    // 슬라이더 범위 내의 proposals만 필터링
    const visibleProposals = Object.entries(proposals).filter(([_, proposal]) => {
      const proposalTime = proposal.timeVotingStart;
      return proposalTime >= timeRange[0] && proposalTime <= timeRange[1];
    }).map(([id]) => id);

    // 보이지 않는 proposals를 선택 해제
    const newSelectedProposals = currentSelectedProposals.filter(id => 
      visibleProposals.includes(id)
    );

    // 선택된 proposals가 변경되었다면 업데이트
    if (newSelectedProposals.length !== currentSelectedProposals.length) {
      dispatch(setSelectedProposals({
        chainId: chainName,
        proposalIds: newSelectedProposals
      }));
    }
  }, [timeRange, proposals, chainName, selectedProposals, dispatch]);

  // toggleProposal 동작 시 selectedAll 상태도 업데이트하는 함수 추가
  const handleToggleProposal = (id: string) => {
    dispatch(toggleProposal({ 
      chainId: chainName, 
      proposalId: id 
    }));
    
    // 토글 후의 상태를 예측하여 selectedAll 업데이트
    const isCurrentlySelected = selectedProposals.includes(id);
    if (isCurrentlySelected) {
      setSelectedAll(false);
    } else {
      const willBeSelected = [...selectedProposals, id];
      setSelectedAll(willBeSelected.length === filteredProposals.length);
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <div className="shrink-0 mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Proposals</h2>
            <button
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              onClick={handleReset}
            >
              {selectedAll ? 'Unselect All' : 'Select All'}
            </button>
          </div>
          <div className="search-container relative flex items-center gap-2">
            <select
              className="px-3 py-1 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
            >
              {SEARCH_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onClear={() => setIsSearchFocused(false)}
              placeholder={`Search by ${searchType.toLowerCase()}...`}
              results={searchResults}
              onResultClick={handleResultClick}
            />
          </div>
        </div>

        {/* 정렬 드롭다운 추가 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            className="px-3 py-1 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 범례 섹션 수정 */}
        <div className="mt-4">
          <div className="flex gap-3">
            {Object.entries(VOTE_COLOR_CLASSES).map(([option, colorClass]) => (
              <div key={option} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${colorClass.split(' ')[0]}`} />
                <span className="text-sm">
                  {option.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 버튼 컨테이너 */}
      <div className="flex-1 min-h-0 overflow-auto mt-2" style={{ maxHeight: "calc(100% - 240px)" }}>
        <div className="grid auto-rows-fr gap-2 p-2"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(60px, 100%), 1fr))'
          }}
        >
          {filteredProposals.map(([id, proposal]) => {
            const scale = proposal?.ratios ? calculateCompetitiveness(proposal.ratios) : 1.0;
            const isHighlighted = isSearchFocused && debouncedSearchTerm && highlightedProposals.includes(id);
            
            return (
              <button
                key={id}
                onClick={() => handleToggleProposal(id)}
                className={`
                  aspect-square
                  flex items-center justify-center
                  rounded-lg text-xs font-medium
                  transition-all duration-200
                  ${getVoteStyle(id)}
                  ${selectedProposals.includes(id) 
                    ? 'ring-2 ring-blue-500' 
                    : isHighlighted
                      ? 'ring-2 ring-yellow-400 shadow-lg'
                      : 'hover:ring-1 hover:ring-blue-300'
                  }
                  ${isHighlighted ? 'z-10' : ''}
                `}
                style={{
                  transform: `scale(${scale})`,
                  opacity: isSearchFocused && debouncedSearchTerm && !isHighlighted ? '0.4' : '1',
                }}
              >
                <span style={{ transform: `scale(${1/scale})` }}>
                  {id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 타임라인 차트와 슬라이더를 하단에 배치 */}
      {proposals && (
        <div className="mt-4 space-y-2">
          <TimelineChart 
            proposals={proposals}
            timeRange={[
              Math.min(...Object.values(proposals).map(p => p.timeVotingStart)),
              Math.max(...Object.values(proposals).map(p => p.timeVotingStart))
            ]}
            selectedRange={timeRange}
          />
          <RangeSlider
            min={Math.min(...Object.values(proposals).map(p => p.timeVotingStart))}
            max={Math.max(...Object.values(proposals).map(p => p.timeVotingStart))}
            value={timeRange}
            onChange={setTimeRange}
          />
        </div>
      )}
    </div>
  );
};

// 디바운스 훅 추가
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
} 