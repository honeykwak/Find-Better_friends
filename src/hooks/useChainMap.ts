import { useState, useEffect } from 'react';
import { useAppSelector } from './useAppSelector';

export const useChainMap = () => {
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());
  const coordinateData = useAppSelector(state => state.chain.coordinateData);

  useEffect(() => {
    if (!coordinateData) return;

    const newMap = new Map<string, Set<string>>();
    
    // chain_coords_dict의 각 체인에 대해
    Object.entries(coordinateData.chain_coords_dict).forEach(([chainId, validators]) => {
      // 각 validator에 대해
      validators.forEach(validator => {
        const validatorId = validator.voter;
        
        // validator의 체인 set을 가져오거나 새로 생성
        const chains = newMap.get(validatorId) || new Set<string>();
        chains.add(chainId);
        newMap.set(validatorId, chains);
      });
    });

    setValidatorChainMap(newMap);
  }, [coordinateData]);

  return validatorChainMap;
}; 