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
        // validator analysis 데이터 로드
        const analysisResponse = await fetch('/data/analysis/validator_analysis.json');
        const analysisData: ValidatorAnalysis = await analysisResponse.json();
        setValidatorAnalysis(analysisData);

        // chain proposals 데이터 로드
        const proposalsResponse = await fetch('/data/analysis/chain_proposals.json');
        const proposalsData: ChainProposals = await proposalsResponse.json();
        setChainProposals(proposalsData);

      } catch (error) {
        console.error('Error loading validator data:', error);
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