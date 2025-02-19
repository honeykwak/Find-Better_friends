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

    const { category_votes } = validatorData;
    return (
      <div className="space-y-4">
        {category_votes && Object.entries(category_votes).map(([category, data]) => (
          <div key={category} className="category-block">
            {renderCategoryStats(category, data)}
          </div>
        ))}
      </div>
    );
  }, [selectedChain, loading, error, votingPatterns, validatorName, renderCategoryStats]);

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <h2 className="flex-none text-xl font-semibold mb-4">Validator Summary</h2>
      <div className="flex-1 min-h-0 overflow-auto">
        {content}
      </div>
    </div>
  );
}; 