import { useState, useEffect, useMemo, useCallback } from 'react';
import { CoordinateData, ValidatorData } from '../types';
import * as d3 from 'd3';

export const useValidatorData = (selectedChain: string | null, coordinateType: 'mds' | 'tsne') => {
  const [coordinateData, setCoordinateData] = useState<CoordinateData | null>(null);
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 유효성 검사기 체인 맵 생성 로직
  const createValidatorChainMap = useCallback((data: CoordinateData) => {
    const mapping = new Map<string, Set<string>>();
    
    Object.entries(data.chain_coords_dict).forEach(([chainId, validators]) => {
      validators.forEach(validator => {
        const chainSet = mapping.get(validator.voter) || new Set<string>();
        chainSet.add(chainId);
        mapping.set(validator.voter, chainSet);
      });
    });

    return mapping;
  }, []);

  // 데이터 로딩 로직
  const loadCoordinates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/data/coordinates/coordinates.json');
      const data: CoordinateData = await response.json();
      setCoordinateData(data);
      
      const mapping = createValidatorChainMap(data);
      setValidatorChainMap(mapping);
    } catch (error) {
      console.error('Error loading coordinates:', error);
      setError('Failed to load validator data.');
    } finally {
      setIsLoading(false);
    }
  }, [createValidatorChainMap]);

  // 초기 데이터 로딩
  useEffect(() => {
    loadCoordinates();
  }, [loadCoordinates]);

  // 표시 데이터 변환 로직
  const displayData = useMemo(() => {
    if (!coordinateData) return [];
    
    try {
      let currentData;
      if (!selectedChain) {
        // 전체 체인(coordinates) 데이터의 경우
        const coordinatesData = (coordinateData.coords_dict as any)?.coordinates || [];
        
        // x, y 좌표의 범위 계산
        const xValues = coordinatesData.map((d: ValidatorData) => d.x ?? 0);
        const yValues = coordinatesData.map((d: ValidatorData) => d.y ?? 0);
        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        
        // 여백 비율 설정 (5%)
        const xPadding = (xMax - xMin) * 0.05;
        const yPadding = (yMax - yMin) * 0.05;
        
        // 화면을 최대한 활용하는 스케일 조정
        const xScale = d3.scaleLinear()
          .domain([xMin - xPadding, xMax + xPadding])
          .range([0, 1]);  // 0-1 범위로 변경
        const yScale = d3.scaleLinear()
          .domain([yMin - yPadding, yMax + yPadding])
          .range([0, 1]);  // 0-1 범위로 변경
        
        currentData = coordinatesData.map((d: ValidatorData) => ({
          voter: d.voter,
          x: xScale(d.x ?? 0),
          y: yScale(d.y ?? 0),
          cluster: d.cluster,
          mds_x: d.mds_x,
          mds_y: d.mds_y,
          tsne_x: d.tsne_x,
          tsne_y: d.tsne_y
        }));
      } else {
        // 개별 체인의 경우 - 선택된 좌표 타입에 따라 다른 좌표 사용
        const chainValidators = coordinateData.chain_coords_dict?.[selectedChain] || [];
        
        if (coordinateType === 'mds') {
          // MDS 좌표 사용
          const mdsXValues = chainValidators.map((d: ValidatorData) => d.mds_x ?? 0);
          const mdsYValues = chainValidators.map((d: ValidatorData) => d.mds_y ?? 0);
          const mdsXMin = Math.min(...mdsXValues);
          const mdsXMax = Math.max(...mdsXValues);
          const mdsYMin = Math.min(...mdsYValues);
          const mdsYMax = Math.max(...mdsYValues);
          
          // 여백 비율 설정 (5%)
          const xPadding = (mdsXMax - mdsXMin) * 0.05;
          const yPadding = (mdsYMax - mdsYMin) * 0.05;
          
          const mdsXScale = d3.scaleLinear()
            .domain([mdsXMin - xPadding, mdsXMax + xPadding])
            .range([0, 1]);
          const mdsYScale = d3.scaleLinear()
            .domain([mdsYMin - yPadding, mdsYMax + yPadding])
            .range([0, 1]);
          
          currentData = chainValidators.map((d: ValidatorData) => ({
            voter: d.voter,
            x: mdsXScale(d.mds_x ?? 0),
            y: mdsYScale(d.mds_y ?? 0),
            cluster: d.cluster,
            mds_x: d.mds_x,
            mds_y: d.mds_y,
            tsne_x: d.tsne_x,
            tsne_y: d.tsne_y
          }));
        } else {
          // TSNE 좌표 사용
          const tsneXValues = chainValidators.map((d: ValidatorData) => d.tsne_x ?? 0);
          const tsneYValues = chainValidators.map((d: ValidatorData) => d.tsne_y ?? 0);
          const tsneXMin = Math.min(...tsneXValues);
          const tsneXMax = Math.max(...tsneXValues);
          const tsneYMin = Math.min(...tsneYValues);
          const tsneYMax = Math.max(...tsneYValues);
          
          // 여백 비율 설정 (5%)
          const xPadding = (tsneXMax - tsneXMin) * 0.05;
          const yPadding = (tsneYMax - tsneYMin) * 0.05;
          
          const tsneXScale = d3.scaleLinear()
            .domain([tsneXMin - xPadding, tsneXMax + xPadding])
            .range([0, 1]);
          const tsneYScale = d3.scaleLinear()
            .domain([tsneYMin - yPadding, tsneYMax + yPadding])
            .range([0, 1]);
          
          currentData = chainValidators.map((d: ValidatorData) => ({
            voter: d.voter,
            x: tsneXScale(d.tsne_x ?? 0),
            y: tsneYScale(d.tsne_y ?? 0),
            cluster: d.cluster,
            mds_x: d.mds_x,
            mds_y: d.mds_y,
            tsne_x: d.tsne_x,
            tsne_y: d.tsne_y
          }));
        }
      }

      const processedData = currentData.map((d: ValidatorData, index: number) => ({
        ...d,
        isAnimated: true,
        animationBegin: Math.floor(index / 50) * 20 // BATCH_SIZE와 STAGGER_DELAY 사용
      }));

      return processedData;
    } catch (error) {
      console.error('Error processing display data:', error);
      return [];
    }
  }, [coordinateData, selectedChain, coordinateType]);

  return {
    coordinateData,
    validatorChainMap,
    displayData,
    isLoading,
    error
  };
};