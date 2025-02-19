import React, { useEffect, useState, useMemo } from 'react';
import { 
  ValidatorVotingPattern, 
  CategoryVotes, 
  CategoryVoteStats,
  handleError
} from '../../types';
import { RootState } from '../../store';
import './ValidatorSummary.css';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { CLUSTER_LABELS } from '../../constants';
import { toggleFilter, clearFilters } from '../../store/slices/filterSlice';

interface ValidatorSummaryProps {
  chainName: string;
  validatorName: string;
}

interface VotingPatternsData {
  [validator: string]: ValidatorVotingPattern;
}

export const ValidatorSummary: React.FC<ValidatorSummaryProps> = ({ chainName, validatorName }) => {
  const [votingPatterns, setVotingPatterns] = useState<VotingPatternsData | null>(null);
  const selectedChain = useAppSelector((state: RootState) => state.chain.selectedChain);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const coordinateData = useAppSelector((state) => state.chain.coordinateData);
  const validatorChains = useAppSelector((state) => state.chain.validatorChains);

  const validatorCluster = useMemo(() => {
    if (!coordinateData?.chain_coords_dict?.[chainName]) return null;
    
    const validator = coordinateData.chain_coords_dict[chainName].find(
      v => v.voter === validatorName
    );
    
    return validator?.cluster || null;
  }, [coordinateData, chainName, validatorName]);

  const dispatch = useAppDispatch();

  const activeFilters = useAppSelector(state => state.filter.activeFilters);

  // validatorName이 변경될 때 필터 초기화
  useEffect(() => {
    // clearFilters 액션을 dispatch하여 모든 필터 초기화
    dispatch(clearFilters());
  }, [validatorName, dispatch]);

  useEffect(() => {
    const loadVotingPatterns = async () => {
      if (!chainName || !validatorName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const url = `/data/analysis/voting_patterns/${chainName.toLowerCase()}.json`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setVotingPatterns(data);
      } catch (error: unknown) {
        setError(handleError(error));
      } finally {
        setLoading(false);
      }
    };

    loadVotingPatterns();
  }, [chainName, validatorName]);

  // 상태값들 확인
  console.log('Component state:', {
    loading,
    error,
    hasVotingPatterns: !!votingPatterns,
    validatorName,
    validatorExists: votingPatterns?.[validatorName] !== undefined
  });

  // 카테고리 통계 렌더링 함수 메모이제이션
  const renderCategoryStats = useMemo(() => (category: string, data: CategoryVotes) => {
    return (
      <div className="category-stats">
        <h4>{category.charAt(0).toUpperCase() + category.slice(1)}</h4>
        <div className="category-total">
          Total: {(data.total.ratio * 100).toFixed(1)}% ({data.total.count} votes)
        </div>
        <div className="subcategories">
          {Object.entries(data.subcategories).map(([subcat, stats]: [string, CategoryVoteStats]) => (
            <div key={subcat} className="subcategory">
              {subcat.replace(/_/g, ' ')}: {(stats.ratio * 100).toFixed(1)}%
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  const handleFilterClick = (type: 'cluster' | 'chains', value: number | string) => {
    dispatch(toggleFilter({ type, value }));
  };

  // 버튼의 선택 상태 확인
  const isFilterActive = (type: 'cluster' | 'chains', value: number | string) => {
    return activeFilters[type] === value;
  };

  // 콘텐츠 렌더링 로직 메모이제이션
  const content = useMemo(() => {
    if (!selectedChain) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-500">Please select a chain to view voting patterns</p>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="h-full flex items-center justify-center">
          <p>Loading voting patterns...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }

    if (!votingPatterns || !validatorName) {
      return null;
    }

    const validatorData = votingPatterns[validatorName];
    if (!validatorData) {
      return null;
    }

    return (
      <div className="space-y-6">
        {validatorCluster && (
          <button
            onClick={() => handleFilterClick('cluster', validatorCluster)}
            className={`w-full p-4 rounded-lg transition-colors ${
              isFilterActive('cluster', validatorCluster)
                ? 'bg-blue-50 hover:bg-blue-100'
                : 'bg-gray-50 hover:bg-gray-100'
            }`}
          >
            <h3 className="font-medium text-gray-700 mb-2">Cluster Group</h3>
            <p className="text-lg font-medium text-blue-600">
              {CLUSTER_LABELS[validatorCluster]}
            </p>
          </button>
        )}

        <button
          onClick={() => handleFilterClick('chains', validatorName)}
          className={`w-full p-4 rounded-lg transition-colors ${
            isFilterActive('chains', validatorName)
              ? 'bg-blue-50 hover:bg-blue-100'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <h3 className="font-medium text-gray-700 mb-2">Active Chains</h3>
          <div className="flex flex-wrap gap-2">
            {validatorChains.map(chain => (
              <span 
                key={chain}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {coordinateData?.chain_info[chain]?.name || chain}
              </span>
            ))}
          </div>
        </button>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Voting Patterns</h3>
          {validatorData.category_votes && Object.entries(validatorData.category_votes).map(([category, data]) => (
            <div key={category} className="category-block">
              {renderCategoryStats(category, data)}
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    selectedChain,
    loading,
    error,
    votingPatterns,
    validatorName,
    renderCategoryStats,
    validatorCluster,
    validatorChains,
    coordinateData,
    handleFilterClick,
    activeFilters
  ]);

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <h2 className="flex-none text-xl font-semibold mb-4">Validator Summary</h2>
      <div className="flex-1 min-h-0 overflow-auto">
        {content}
      </div>
    </div>
  );
}; 