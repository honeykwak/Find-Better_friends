import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { 
  ProposalData,
  // isProposalData
} from '../../types';
import { setSelectedProposals, toggleProposal } from '../../store/slices/proposalSlice';
// import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { selectSelectedProposalsByChain } from '../../store/selectors';

interface ProposalListProps {
  chainName: string;
  proposals: {[proposalId: string]: ProposalData} | null;
}

interface ProposalItemProps {
  proposal: ProposalData;
  isSelected: boolean;
  onToggle: () => void;
}

const ProposalItem: React.FC<ProposalItemProps> = ({ proposal, isSelected, onToggle }) => (
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

export const ProposalList: React.FC<ProposalListProps> = ({ chainName, proposals }) => {
  const dispatch = useAppDispatch();
  
  // 메모이제이션된 셀렉터 사용
  const selectedProposals = useAppSelector(
    state => selectSelectedProposalsByChain(state, chainName)
  );

  // const chainProposals = useAppSelector(
  //   state => selectChainProposals(state, chainName)
  // );

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedAll, setSelectedAll] = useState(true);

  // 검색 디바운싱 추가
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // 필터링된 제안 메모이제이션 개선
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    
    return Object.entries(proposals)
      .filter(([_, proposal]) => {
        if (!debouncedSearchTerm) return true;
        return proposal.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      })
      .sort((a, b) => a[1].title.localeCompare(b[1].title));
  }, [proposals, debouncedSearchTerm]);

  // 검색 결과 메모이제이션
  const searchResults = useMemo(() => {
    if (!isSearchFocused || !debouncedSearchTerm) return [];
    return filteredProposals.slice(0, 5);
  }, [filteredProposals, isSearchFocused, debouncedSearchTerm]);

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
          <div className="relative search-container">
            <div className="relative">
              <input
                type="text"
                className="w-64 px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search proposals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    setSearchTerm('');
                    setIsSearchFocused(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {isSearchFocused && (
              <div className="absolute z-10 w-64 mt-1 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="absolute inset-0 bg-white opacity-80 backdrop-blur-sm rounded-lg" />
                {searchResults.map(([id, proposal]) => (
                  <div
                    key={id}
                    className={`
                      relative px-4 py-2 cursor-pointer
                      hover:bg-gray-100/70
                      ${selectedProposals.includes(id) ? 'bg-blue-50/70 text-blue-600' : ''}
                    `}
                    onClick={() => {
                      dispatch(toggleProposal({ 
                        chainId: chainName, 
                        proposalId: id 
                      }));
                      setIsSearchFocused(false);
                      setSearchTerm('');
                    }}
                  >
                    {proposal.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto mt-4">
        <div className="space-y-2">
          {filteredProposals.map(([id, proposal]) => (
            <ProposalItem
              key={id}
              proposal={proposal}
              isSelected={selectedProposals.includes(id)}
              onToggle={() => dispatch(toggleProposal({ 
                chainId: chainName, 
                proposalId: id 
              }))}
            />
          ))}
        </div>
      </div>
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