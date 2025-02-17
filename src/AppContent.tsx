import React, { useState, useEffect } from 'react';
import { ChainSection } from './components/chain/ChainSection';
import { ValidatorOverview } from './components/validator/ValidatorOverview';
import { ValidatorInfo } from './components/validator/ValidatorInfo';
import { 
  ValidatorAnalysis, 
  ChainProposals, 
  CoordinateData,
  ValidatorData
} from './types';
import { useAppSelector } from './hooks/useAppSelector';

export const AppContent: React.FC = () => {
  const [validatorAnalysis, setValidatorAnalysis] = useState<ValidatorAnalysis | null>(null);
  const [chainProposals, setChainProposals] = useState<ChainProposals | null>(null);
  const [validatorChainMap, setValidatorChainMap] = useState<Map<string, Set<string>>>(new Map());

  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coordinatesResponse, analysisResponse, proposalsResponse] = await Promise.all([
          fetch('/src/data/coordinates/coordinates.json'),
          fetch('/src/data/coordinates/validator_analysis.json'),
          fetch('/src/data/coordinates/chain_proposals.json')
        ]);

        const [coordinates, analysis, proposals] = await Promise.all([
          coordinatesResponse.json(),
          analysisResponse.json(),
          proposalsResponse.json()
        ]) as [CoordinateData, ValidatorAnalysis, ChainProposals];

        const mapping = new Map<string, Set<string>>();
        Object.entries(coordinates.chain_coords_dict).forEach(([chainId, validators]) => {
          validators.forEach((validator: ValidatorData) => {
            const chainSet = mapping.get(validator.voter) || new Set<string>();
            chainSet.add(chainId);
            mapping.set(validator.voter, chainSet);
          });
        });
        
        setValidatorChainMap(mapping);
        setValidatorAnalysis(analysis);
        setChainProposals(proposals);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const validatorChains = selectedValidator 
    ? Array.from(validatorChainMap.get(selectedValidator.voter) || [])
    : [];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Find Better Friends</h1>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <ChainSection />
        </div>
        <ValidatorOverview />
        <ValidatorInfo 
          validator={selectedValidator}
          validatorChains={validatorChains}
          validatorAnalysis={validatorAnalysis || {}}
          chainProposals={chainProposals || {}}
        />
      </div>
    </div>
  );
}; 