import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  ProposalData,
  // isProposalData
} from '../../types';
import { setSelectedProposals, toggleProposal } from '../../store/slices/proposalSlice';
import { selectSelectedProposalsByChain } from '../../store/selectors';
import { VerticalTimelineSlider } from './VerticalTimelineSlider';
import { SearchInput } from '../common/SearchInput';
import { SearchResult } from '../../types/search';
import { VOTE_COLOR_CLASSES } from '../../constants';
import { useDebounce } from '../../hooks/useDebounce';
import { ProposalTooltip } from './ProposalTooltip';

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

// 분할 옵션 타입 (기존 SortOption을 SplitOption으로 변경)
type SplitOption = 'none' | 'monthly' | 'quarterly' | 'biannually' | 'yearly' | 'type' | 'competitiveness';

// 정렬 옵션 타입 추가
type SortOption = 'latest' | 'competitiveness';

// 분할 옵션 정의 (기존 SORT_OPTIONS를 SPLIT_OPTIONS로 변경)
const SPLIT_OPTIONS = [
  { value: 'none', label: 'None (No Grouping)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannually', label: 'Biannually' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'type', label: 'Type' },
  { value: 'competitiveness', label: 'Competitiveness' }
] as const;

// 정렬 옵션 정의 추가
const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'competitiveness', label: 'Competitiveness' }
] as const;

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
  const additionalValidator = useAppSelector(state => state.validator.additionalValidator);
  const votingPatterns = useAppSelector(state => state.votingPatterns.patternsByChain[chainName]);
  
  // loading state는 데이터 존재 여부로 대체
  const isLoading = !votingPatterns;

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

  // 컴포넌트 내부에 상태 변수 추가/변경
  const [splitOption, setSplitOption] = useState<SplitOption>('none');
  const [sortOption, setSortOption] = useState<SortOption>('latest');

  // 컴포넌트 내부에 검색 타입 상태 추가
  const [searchType, setSearchType] = useState<SearchType>('ALL');

  // 필터링된 제안 메모이제이션 수정 - 분할과 정렬 로직 분리
  const filteredProposalsByMonth = useMemo(() => {
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

    // 정렬 로직 - sortOption에 따라 정렬
    const sortedProposals = filtered.sort((a, b) => {
      const [idA, proposalA] = a;
      const [idB, proposalB] = b;

      switch (sortOption) {
        case 'latest':
          return Number(idB) - Number(idA); // 최신순 정렬
        case 'competitiveness': {
          const compA = calculateCompetitiveness(proposalA.ratios);
          const compB = calculateCompetitiveness(proposalB.ratios);
          return compB - compA; // 경쟁 심화도 높은 순으로 정렬
        }
        default:
          return Number(idB) - Number(idA); // 기본은 최신순
      }
    });

    // 분할 로직 - splitOption에 따라 그룹화
    // 시간 기반 분할 옵션들 (monthly, quarterly, biannually, yearly)
    if (['monthly', 'quarterly', 'biannually', 'yearly'].includes(splitOption)) {
      // 시간 단위별 그룹화 함수
      const getTimeKey = (timestamp: number) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        switch (splitOption) {
          case 'monthly':
            return { key: `${year}-${month.toString().padStart(2, '0')}`, name: `${getMonthName(month)} ${year}` };
          case 'quarterly':
            const quarter = Math.ceil(month / 3);
            return { key: `${year}-Q${quarter}`, name: `Q${quarter} ${year}` };
          case 'biannually':
            const half = month <= 6 ? 1 : 2;
            return { key: `${year}-H${half}`, name: `H${half} ${year}` };
          case 'yearly':
            return { key: `${year}`, name: `${year}` };
          default: // latest (월별)
            return { key: `${year}-${month.toString().padStart(2, '0')}`, name: `${getMonthName(month)} ${year}` };
        }
      };
      
      // 월 이름 가져오기 함수
      const getMonthName = (month: number) => {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return monthNames[month - 1];
      };
      
      // 시간 단위별로 그룹화
      const groupedByTime: { [timeKey: string]: { key: string, name: string, proposals: [string, ProposalData][] } } = {};
      
      sortedProposals.forEach(proposal => {
        const { key, name } = getTimeKey(proposal[1].timeVotingStart);
        
        if (!groupedByTime[key]) {
          groupedByTime[key] = { key, name, proposals: [] };
        }
        
        groupedByTime[key].proposals.push(proposal);
      });
      
      // 시간 단위별 그룹을 시간 역순으로 정렬
      return Object.values(groupedByTime)
        .sort((a, b) => b.key.localeCompare(a.key))
        .map(({ key, name, proposals }) => {
          return {
            monthKey: key,
            monthName: name,
            proposals
          };
        });
    }
    
    // type 분할일 때 타입별 그룹화
    if (splitOption === 'type') {
      // 타입별로 그룹화
      const groupedByType: { [typeKey: string]: [string, ProposalData][] } = {};
      
      sortedProposals.forEach(proposal => {
        const type = proposal[1].type;
        
        if (!groupedByType[type]) {
          groupedByType[type] = [];
        }
        
        groupedByType[type].push(proposal);
      });
      
      // 타입별 그룹을 알파벳순으로 정렬
      return Object.entries(groupedByType)
        .sort((a, b) => {
          const [typeA] = a;
          const [typeB] = b;
          return typeA.localeCompare(typeB);
        })
        .map(([type, proposals]) => {
          return {
            monthKey: type, // 그룹 키로 타입 사용
            monthName: type, // 표시 이름으로 타입 사용
            proposals
          };
        });
    }
    
    // competitiveness 분할일 때 경쟁 심화도별 그룹화
    if (splitOption === 'competitiveness') {
      // 경쟁 심화도 단계 정의 (5단계)
      const competitivenessLevels = [
        { key: 'very-high', name: 'Very High Competition (90-100%)', min: 0.9, max: 1.0 },
        { key: 'high', name: 'High Competition (70-90%)', min: 0.7, max: 0.9 },
        { key: 'medium', name: 'Medium Competition (50-70%)', min: 0.5, max: 0.7 },
        { key: 'low', name: 'Low Competition (30-50%)', min: 0.3, max: 0.5 },
        { key: 'very-low', name: 'Very Low Competition (0-30%)', min: 0.0, max: 0.3 }
      ];
      
      // 경쟁 심화도별로 그룹화
      const groupedByCompetitiveness: { [levelKey: string]: [string, ProposalData][] } = {};
      
      // 각 단계별 빈 그룹 초기화
      competitivenessLevels.forEach(level => {
        groupedByCompetitiveness[level.key] = [];
      });
      
      // 제안서를 경쟁 심화도에 따라 그룹화
      sortedProposals.forEach(proposal => {
        const comp = calculateCompetitiveness(proposal[1].ratios);
        
        // 해당하는 단계 찾기
        const level = competitivenessLevels.find(
          level => comp >= level.min && comp < level.max
        ) || competitivenessLevels[competitivenessLevels.length - 1]; // 기본값은 가장 낮은 단계
        
        groupedByCompetitiveness[level.key].push(proposal);
      });
      
      // 경쟁 심화도 단계별로 그룹 반환 (높은 순)
      return competitivenessLevels
        .filter(level => groupedByCompetitiveness[level.key].length > 0) // 비어있는 그룹 제외
        .map(level => ({
          monthKey: level.key,
          monthName: level.name,
          proposals: groupedByCompetitiveness[level.key]
        }));
    }
    
    // none 옵션이거나 다른 분할 옵션의 경우 그룹화 없이 반환
    return [{
      monthKey: 'all',
      monthName: '',
      proposals: sortedProposals
    }];
  }, [proposals, timeRange, debouncedSearchTerm, splitOption, sortOption]); // 의존성 배열에 splitOption과 sortOption 모두 추가

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
    const newSelected = selectedAll ? [] : filteredProposalsByMonth.map(({ proposals }) => proposals.map(([id]) => id));
    dispatch(setSelectedProposals({ 
      chainId: chainName, 
      proposalIds: newSelected.flat() 
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

  // 제안서 렌더링 로직 수정 - 기준 validator와 추가 validator의 투표 일치 여부에 따라 스타일 적용
  const [tooltipData, setTooltipData] = useState<{
    proposal: ProposalData;
    position: { x: number; y: number };
  } | null>(null);

  const renderProposals = () => {
    if (!proposals) return null;
    
    // 월별/타입별/경쟁심화도별 그룹화된 제안서 렌더링
    return (
      <>
        {filteredProposalsByMonth.map(({ monthKey, monthName, proposals }) => {
          // 그룹 내 모든 제안서가 선택되었는지 확인
          const groupProposalIds = proposals.map(([id]) => id);
          const allSelected = groupProposalIds.length > 0 && 
            groupProposalIds.every(id => selectedProposals.includes(id));
          const someSelected = groupProposalIds.some(id => selectedProposals.includes(id));
          
          return (
            <React.Fragment key={monthKey}>
              {/* 구분선 (모든 정렬 옵션에 대해 표시) - 체크박스와 제안서 개수 추가 */}
              {monthName && (
                <div className="col-span-full flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`group-${monthKey}`}
                      checked={allSelected}
                      className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                        someSelected && !allSelected ? 'bg-blue-200' : ''
                      }`}
                      onChange={() => handleGroupToggle(proposals)}
                    />
                    <label 
                      htmlFor={`group-${monthKey}`}
                      className="text-sm font-medium text-gray-700 whitespace-nowrap cursor-pointer"
                    >
                      {monthName} <span className="text-gray-500 text-xs">({proposals.length})</span>
                    </label>
                  </div>
                  <div className="flex-grow border-b border-gray-300"></div>
                </div>
              )}
              
              {/* 해당 그룹의 제안서들 */}
              {proposals.map(([id, proposal]) => {
        // 기준 validator의 투표 정보 가져오기
        const primaryVoteData = selectedValidator && votingPatterns?.[selectedValidator.voter]?.proposal_votes?.[id];
        const primaryVote = primaryVoteData?.option;
        
        // 추가 validator의 투표 정보 가져오기
        const additionalVoteData = additionalValidator && votingPatterns?.[additionalValidator.voter]?.proposal_votes?.[id];
        const additionalVote = additionalVoteData?.option;
        
        // 두 validator가 모두 투표했는지 확인
        const bothVoted = primaryVote && additionalVote;
        
        // 투표 일치 여부 확인 (둘 다 투표했고 같은 옵션을 선택한 경우)
        const votesMatch = bothVoted && primaryVote === additionalVote;
        
        // 투명도 로직:
        // 1. 추가 validator가 없으면 모두 불투명(1)
        // 2. 추가 validator가 있고:
        //    - 둘 다 투표했고 일치하면 불투명(1)
        let opacity = 1;
        
        if (additionalValidator) {
          if (bothVoted) {
            opacity = votesMatch ? 1 : 0.2;//둘 다 투표했고 불일치하면 투명(0.4)
          } else if (primaryVote || additionalVote) {
            opacity = 0.2;//둘 중 하나만 투표했으면 중간 투명도(0.7)
          } else {
            opacity = 0.2; // 둘 다 투표하지 않은 경우
          }
        }
        
        const isHighlighted = isSearchFocused && debouncedSearchTerm && highlightedProposals.includes(id);
        
        return (
          <button
            key={id}
            data-id={id}
            onClick={() => handleToggleProposal(id)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipData({
                proposal: proposal,
                position: {
                  x: rect.left,
                  y: rect.top
                }
              });
            }}
            onMouseLeave={() => setTooltipData(null)}
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
              ${additionalValidator && bothVoted && votesMatch ? 'ring-2 ring-green-500' : ''}
            `}
            style={{
              transform: `scale(${calculateCompetitiveness(proposal.ratios)})`,
              opacity: opacity,
            }}
          >
            <span style={{ transform: `scale(${1/calculateCompetitiveness(proposal.ratios)})` }}>
              {id}
            </span>
          </button>
        );
              })}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  // 드래그 관련 상태 및 참조 추가
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragEnd, setDragEnd] = useState<{x: number, y: number} | null>(null);
  const dragHandlersRef = useRef<{
    handleMouseMove: ((e: MouseEvent) => void) | null,
    handleMouseUp: ((e: MouseEvent) => void) | null
  }>({
    handleMouseMove: null,
    handleMouseUp: null
  });

  // 마우스 다운 이벤트 핸들러 수정
  const handleMouseDown = (e: React.MouseEvent) => {
    // 좌클릭만 처리
    if (e.button !== 0) return;
    
    // 텍스트 선택 방지
    e.preventDefault();
    
    // 그리드 내부에서만 드래그 시작
    if (gridRef.current && gridRef.current.contains(e.target as Node)) {
      // 버튼 클릭은 무시 (버튼 자체의 클릭 이벤트가 처리)
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 드래그 시작 위치 저장
      const startPos = { x, y };
      
      setIsDragging(true);
      setDragStart(startPos);
      setDragEnd(startPos);
      
      // 스크롤 관련 변수
      let scrollInterval: number | null = null;
      const scrollSpeed = 10; // 스크롤 속도
      const scrollThreshold = 40; // 경계에서 스크롤 시작할 거리 (픽셀)
      
      // 마우스 이벤트 핸들러 정의
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        
        if (gridRef.current) {
          const gridContainer = gridRef.current.parentElement as HTMLElement;
          const rect = gridRef.current.getBoundingClientRect();
          const containerRect = gridContainer.getBoundingClientRect();
          
          // 마우스 위치 계산
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          
          // 그리드 내 상대 좌표 계산 - 가로 및 세로 범위 제한 추가
          const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          
          // 세로 범위 제한 - 스크롤 위치 고려
          const visibleHeight = rect.height;
          const relativeY = e.clientY - rect.top;
          
          // 스크롤 위치를 고려한 세로 좌표 계산
          const y = Math.max(0, Math.min(relativeY, visibleHeight));
          
          // 드래그 종료 위치 업데이트
          setDragEnd({ x, y });
          
          // 자동 스크롤 처리
          if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
          }
          
          // 마우스가 컨테이너 하단 근처에 있으면 아래로 스크롤
          if (mouseY > containerRect.bottom - scrollThreshold) {
            scrollInterval = window.setInterval(() => {
              // 스크롤 가능한 최대 위치 계산
              const maxScrollTop = gridRef.current!.scrollHeight - containerRect.height;
              
              // 최대 스크롤 위치를 초과하지 않도록 제한
              if (gridContainer.scrollTop < maxScrollTop) {
                gridContainer.scrollTop += scrollSpeed;
                
                // 스크롤 후 드래그 영역 업데이트
                if (gridRef.current) {
                  const updatedRect = gridRef.current.getBoundingClientRect();
                  // 가로 범위 제한 유지
                  const updatedX = Math.max(0, Math.min(mouseX - updatedRect.left, updatedRect.width));
                  // 세로 범위 제한 유지
                  const updatedY = Math.max(0, Math.min(mouseY - updatedRect.top, updatedRect.height));
                  setDragEnd({ x: updatedX, y: updatedY });
                }
              } else {
                // 최대 스크롤에 도달하면 인터벌 정리
                if (scrollInterval !== null) {
                  clearInterval(scrollInterval);
                  scrollInterval = null;
                }
              }
            }, 16) as unknown as number;
          }
          // 마우스가 컨테이너 상단 근처에 있으면 위로 스크롤
          else if (mouseY < containerRect.top + scrollThreshold) {
            scrollInterval = window.setInterval(() => {
              // 최소 스크롤 위치를 초과하지 않도록 제한
              if (gridContainer.scrollTop > 0) {
                gridContainer.scrollTop -= scrollSpeed;
                
                // 스크롤 후 드래그 영역 업데이트
                if (gridRef.current) {
                  const updatedRect = gridRef.current.getBoundingClientRect();
                  // 가로 범위 제한 유지
                  const updatedX = Math.max(0, Math.min(mouseX - updatedRect.left, updatedRect.width));
                  // 세로 범위 제한 유지
                  const updatedY = Math.max(0, Math.min(mouseY - updatedRect.top, updatedRect.height));
                  setDragEnd({ x: updatedX, y: updatedY });
                }
              } else {
                // 최소 스크롤에 도달하면 인터벌 정리
                if (scrollInterval !== null) {
                  clearInterval(scrollInterval);
                  scrollInterval = null;
                }
              }
            }, 16) as unknown as number;
          }
        }
      };
      
      const handleMouseUp = (e: MouseEvent) => {
        // 스크롤 인터벌 정리
        if (scrollInterval) {
          clearInterval(scrollInterval);
          scrollInterval = null;
        }
        
        if (gridRef.current) {
          const rect = gridRef.current.getBoundingClientRect();
          // 가로 범위 제한 추가
          const finalX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          // 세로 범위 제한 추가
          const finalY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
          
          // 마지막 위치 업데이트
          setDragEnd({ x: finalX, y: finalY });
          
          // 드래그 영역 계산 - 시작 위치를 클로저에서 직접 사용
          const minX = Math.min(startPos.x, finalX);
          const maxX = Math.max(startPos.x, finalX);
          const minY = Math.min(startPos.y, finalY);
          const maxY = Math.max(startPos.y, finalY);
          
          // 드래그 영역 내의 버튼 요소들 찾기
          const buttons = gridRef.current.querySelectorAll('button[data-id]');
          const selectedButtons: HTMLButtonElement[] = [];
          
          buttons.forEach(button => {
            const rect = button.getBoundingClientRect();
            const gridRect = gridRef.current!.getBoundingClientRect();
            
            // 버튼의 중심점 계산
            const buttonX = rect.left - gridRect.left + rect.width / 2;
            const buttonY = rect.top - gridRect.top + rect.height / 2;
            
            // 드래그 영역과 버튼 중심점 교차 확인
            if (buttonX >= minX && buttonX <= maxX && buttonY >= minY && buttonY <= maxY) {
              selectedButtons.push(button as HTMLButtonElement);
            }
          });
          
          // 선택된 버튼들의 ID 추출
          const proposalIds = selectedButtons.map(button => button.getAttribute('data-id')).filter(Boolean) as string[];
          
          // 콘솔에 선택된 버튼 정보 출력 (디버깅용)
          console.log('Selected buttons:', selectedButtons.length);
          console.log('Selected proposal IDs:', proposalIds);
          
          if (proposalIds.length > 0) {
            // 항상 기존 선택에 추가
            const newSelectedProposals = [...new Set([...selectedProposals, ...proposalIds])];
            dispatch(setSelectedProposals({ 
              chainId: chainName, 
              proposalIds: newSelectedProposals 
            }));
          }
        }
        
        // 드래그 상태 초기화 (중요!)
        setIsDragging(false);
        setDragStart(null);
        setDragEnd(null);
        
        // 문서 레벨 이벤트 리스너 제거
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // 핸들러 참조 초기화
        dragHandlersRef.current.handleMouseMove = null;
        dragHandlersRef.current.handleMouseUp = null;
      };
      
      // 핸들러 참조 저장
      dragHandlersRef.current.handleMouseMove = handleMouseMove;
      dragHandlersRef.current.handleMouseUp = handleMouseUp;
      
      // 문서 레벨 이벤트 리스너 추가
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // 컴포넌트 정리 시 이벤트 리스너 제거
  useEffect(() => {
    return () => {
      if (dragHandlersRef.current.handleMouseMove) {
        document.removeEventListener('mousemove', dragHandlersRef.current.handleMouseMove);
      }
      if (dragHandlersRef.current.handleMouseUp) {
        document.removeEventListener('mouseup', dragHandlersRef.current.handleMouseUp);
      }
    };
  }, []);

  // 투표 결과에 따른 버튼 스타일 결정
  const getVoteStyle = (proposalId: string) => {
    if (!selectedValidator || !votingPatterns || isLoading) {
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

  // toggleProposal 동작 시 selectedAll 상태도 업데이트하는 함수 수정
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
      // 모든 제안서의 총 개수 계산
      const totalProposalCount = filteredProposalsByMonth.reduce((sum, { proposals }) => sum + proposals.length, 0);
      setSelectedAll(willBeSelected.length === totalProposalCount);
    }
  };

  // 그룹 선택 핸들러 함수 추가
  const handleGroupToggle = (proposals: [string, ProposalData][]) => {
    // 그룹 내 모든 제안서 ID 추출
    const groupProposalIds = proposals.map(([id]) => id);
    
    // 그룹 내 모든 제안서가 이미 선택되어 있는지 확인
    const allSelected = groupProposalIds.every(id => selectedProposals.includes(id));
    
    // 모두 선택되어 있으면 해제, 아니면 선택
    if (allSelected) {
      // 선택된 제안서에서 그룹 제안서 제거
      const newSelectedProposals = selectedProposals.filter(id => !groupProposalIds.includes(id));
      dispatch(setSelectedProposals({ 
        chainId: chainName, 
        proposalIds: newSelectedProposals 
      }));
    } else {
      // 그룹 제안서 추가 (중복 제거)
      const newSelectedProposals = [...new Set([...selectedProposals, ...groupProposalIds])];
      dispatch(setSelectedProposals({ 
        chainId: chainName, 
        proposalIds: newSelectedProposals 
      }));
    }
    
    // selectedAll 상태 업데이트
    const totalProposalCount = filteredProposalsByMonth.reduce((sum, { proposals }) => sum + proposals.length, 0);
    const newSelectedCount = allSelected 
      ? selectedProposals.length - groupProposalIds.length 
      : new Set([...selectedProposals, ...groupProposalIds]).size;
    
    setSelectedAll(newSelectedCount === totalProposalCount);
  };

  // 기존의 개별 proposal 로그를 제거하고 하나의 요약된 로그로 변경
  useEffect(() => {
    const proposalSummary = {
      totalProposals: proposals ? Object.keys(proposals).length : 0,
      selectedProposalsCount: selectedProposals.length,
      votingPatternsAvailable: !!votingPatterns,
      timeRange: timeRange,
      filterSummary: {
        searchQuery: debouncedSearchTerm,
        splitOption,
        sortOption,
        searchType
      },
      proposalsWithoutVotes: proposals ? Object.entries(proposals).filter(([_, p]) => {
        const primaryVote = votingPatterns?.[selectedValidator?.voter || '']?.proposal_votes?.[p.id]?.option;
        return !primaryVote;
      }).length : 0,
      selectedProposalIds: selectedProposals
    };

    console.group('ProposalList Summary');
    console.log('Proposals Overview:', proposalSummary);
    console.groupEnd();
  }, [
    proposals, 
    selectedProposals, 
    votingPatterns, 
    timeRange, 
    debouncedSearchTerm, 
    splitOption, 
    sortOption, 
    searchType, 
    selectedValidator
  ]);

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      {/* 상단 컨트롤 영역 */}
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

        {/* 분할 및 정렬 드롭다운 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Split by:</span>
            <select
              className="px-3 py-1 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={splitOption}
              onChange={(e) => setSplitOption(e.target.value as SplitOption)}
            >
              {SPLIT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
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
        </div>

        {/* 범례 섹션 */}
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

      {/* 메인 컨텐츠 영역 - 타임라인과 그리드를 나란히 배치 */}
      <div className="flex-1 min-h-0 flex flex-row">
        {/* 세로 타임라인 슬라이더를 좌측에 배치 */}
        {proposals && (
          <div className="mr-4 h-full" style={{ width: '60px' }}>
            <VerticalTimelineSlider
              proposals={proposals}
              timeRange={[
                Math.min(...Object.values(proposals).map(p => p.timeVotingStart)),
                Math.max(...Object.values(proposals).map(p => p.timeVotingStart))
              ]}
              selectedRange={timeRange}
              onRangeChange={setTimeRange}
            />
          </div>
        )}

        {/* 버튼 그리드 컨테이너 */}
        <div className="flex-1 overflow-auto">
          <div 
            ref={gridRef}
            className="grid auto-rows-fr gap-2 p-2 relative select-none"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, 60px)',
              justifyContent: 'start'
            }}
            onMouseDown={handleMouseDown}
          >
            {/* 드래그 선택 영역 */}
            {isDragging && dragStart && dragEnd && (
              <div 
                className="absolute bg-blue-200 bg-opacity-40 border border-blue-400 z-10 pointer-events-none"
                style={{
                  left: Math.min(dragStart.x, dragEnd.x) + 'px',
                  top: Math.min(dragStart.y, dragEnd.y) + 'px',
                  width: Math.abs(dragEnd.x - dragStart.x) + 'px',
                  height: Math.abs(dragEnd.y - dragStart.y) + 'px'
                }}
              />
            )}
            {renderProposals()}
          </div>
        </div>
      </div>
      {tooltipData && <ProposalTooltip {...tooltipData} />}
    </div>
  );
}; 