import { useState, useEffect, useMemo, useRef } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { ValidatorData } from '../../types';
import { setSelectedValidator, setAdditionalValidator } from '../../store/slices/validatorSlice';
import { setValidatorChains } from '../../store/slices/chainSlice';
import { SearchInput } from '../common/SearchInput';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { SearchResult } from '../../types/search';
import { ValidatorMap } from './ValidatorMap';
import { useValidatorData } from '../../hooks/useValidatorData';

export const ValidatorOverview = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hoveredValidator, setHoveredValidator] = useState<string | null>(null);
  const [coordinateType, setCoordinateType] = useState<'mds' | 'tsne'>('mds');

  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const selectedClusters = useAppSelector(state => state.chain.selectedClusters);
  const currentValidator = useAppSelector(state => state.validator.selectedValidator);
  const additionalValidator = useAppSelector(state => state.validator.additionalValidator);

  // 데이터 로딩 및 변환에 커스텀 훅 사용
  const { displayData, validatorChainMap, isLoading, error } = useValidatorData(selectedChain, coordinateType);

  // 검색 결과 계산 로직
  const searchResults = useMemo(() => {
    if (!searchTerm || !displayData.length || !isSearchFocused) return [];

    const term = searchTerm.toLowerCase();
    const maxResults = 10;
    const results: SearchResult<ValidatorData>[] = [];

    // 데이터를 순회하면서 검색어와 일치하는 validator 찾기
    for (const validator of displayData) {
      if (results.length >= maxResults) break;

      // 클러스터 필터링 적용
      if (selectedClusters.length > 0 && !selectedClusters.includes(validator.cluster)) {
        continue;
      }

      // 검색어 포함 여부 확인
      if (validator.voter.toLowerCase().includes(term)) {
        // 검색 결과에 추가
        results.push({
          id: validator.voter,
          text: validator.voter,
          data: validator
        });
      }
    }

    return results;
  }, [searchTerm, displayData, isSearchFocused, selectedClusters]);

  // 유효성 검사기 클릭 핸들러
  const handleValidatorClick = (validator: ValidatorData) => {
    // 이미 선택된 validator면
    if (currentValidator?.voter === validator.voter) {
      // 클릭을 해제하여 선택 취소
      dispatch(setSelectedValidator(null));
      return;
    }

    // 추가 validator로 지정된 것이면
    if (additionalValidator?.voter === validator.voter) {
      // 기존 선택과 교체
      dispatch(setSelectedValidator(validator));
      dispatch(setAdditionalValidator(null));
      
      if (validator.voter) {
        const validatorChains = validatorChainMap.get(validator.voter);
        if (validatorChains) {
          dispatch(setValidatorChains(Array.from(validatorChains)));
        }
      }
      
      return;
    }

    // 이미 기본 validator가 선택되어 있으면 추가 validator로 설정
    if (currentValidator && currentValidator.voter !== validator.voter) {
      dispatch(setAdditionalValidator(validator));
    }
    // 아무것도 선택되지 않았으면 기본 validator로 설정
    else {
      dispatch(setSelectedValidator(validator));
      
      if (validator.voter) {
        const validatorChains = validatorChainMap.get(validator.voter);
        if (validatorChains) {
          dispatch(setValidatorChains(Array.from(validatorChains)));
        }
      }
    }
  };

  const handleResultClick = (result: SearchResult<ValidatorData>) => {
    if (!result || !result.data) return;
    dispatch(setSelectedValidator(result.data));
    if (result.data.voter) {
      const validatorChains = validatorChainMap.get(result.data.voter);
      if (validatorChains) {
        dispatch(setValidatorChains(Array.from(validatorChains)));
      }
    }
    setIsSearchFocused(false);
  };

  // 좌표 타입 전환 함수
  const toggleCoordinateType = () => {
    setCoordinateType(prev => prev === 'mds' ? 'tsne' : 'mds');
  };

  // 외부 클릭 시 검색 드롭다운 닫기 effect 추가
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

  // resetView 함수 참조를 위한 ref 추가
  const resetViewRef = useRef<() => void>(() => {});

  if (isLoading) {
    return (
      <Card className="h-full w-full">
        <div className="shrink-0 mb-2">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Validator Overview</h2>
            <div className="search-container relative">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onClear={() => {
                  setSearchTerm('');
                  setIsSearchFocused(false);
                }}
                placeholder="Search validators..."
                results={[]}
                onResultClick={() => {}}
                onResultHover={() => {}}
              />
            </div>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg text-gray-600">Loading validator data...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full w-full">
        <div className="shrink-0 mb-2">
          <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Validator Overview</h2>
            <div className="search-container relative">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                onFocus={() => setIsSearchFocused(true)}
                onClear={() => {
                  setSearchTerm('');
                  setIsSearchFocused(false);
                }}
                placeholder="Search validators..."
                results={[]}
                onResultClick={() => {}}
                onResultHover={() => {}}
              />
            </div>
          </div>
        </div>
        
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-lg text-red-600">{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full">
      <div className="shrink-0 mb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Validator Overview</h2>
            
            {/* 좌표 타입 전환 버튼 */}
            {selectedChain && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleCoordinateType}
              >
                {coordinateType === 'mds' ? 'Switch to t-SNE' : 'Switch to MDS'}
              </Button>
            )}
            
            {/* Reset View 버튼 추가 */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => resetViewRef.current()}
            >
              Reset View
            </Button>
          </div>
          <div className="search-container relative">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onClear={() => {
                setSearchTerm('');
                setIsSearchFocused(false);
              }}
              placeholder="Search validators..."
              results={searchResults}
              onResultClick={handleResultClick}
              onResultHover={(result) => setHoveredValidator(result ? result.id : null)}
            />
          </div>
        </div>
      </div>
      
      {/* ValidatorMap 컴포넌트 사용 */}
      <ValidatorMap
        displayData={displayData}
        selectedChain={selectedChain}
        coordinateType={coordinateType}
        currentValidator={currentValidator}
        additionalValidator={additionalValidator}
        selectedClusters={selectedClusters}
        hoveredValidator={hoveredValidator}
        searchTerm={searchTerm}
        isSearchFocused={isSearchFocused}
        onValidatorClick={handleValidatorClick}
        onValidatorHover={setHoveredValidator}
        onResetView={(resetFn) => { resetViewRef.current = resetFn; }}
      />
    </Card>
  );
};