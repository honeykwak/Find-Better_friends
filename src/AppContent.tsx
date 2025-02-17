import React, { useState, useEffect } from 'react';
import { ChainSection } from './components/chain/ChainSection';
import { ValidatorOverview } from './components/validator/ValidatorOverview';
import { ValidatorInfo } from './components/validator/ValidatorInfo';
import { 
  ValidatorAnalysis, 
  ChainProposals
} from './types';
import { useAppSelector } from './hooks/useAppSelector';

export const AppContent: React.FC = () => {
  const [validatorAnalysis, setValidatorAnalysis] = useState<ValidatorAnalysis | null>(null);
  const [chainProposals, setChainProposals] = useState<ChainProposals | null>(null);
  
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

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Find Better Friends</h1>
      
      <div className="grid grid-cols-4 gap-6">
        {/* 좌측 Cluster 섹션 (1칸) */}
        <div className="col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <ChainSection />
          </div>
        </div>

        {/* 우측 섹션 (3칸) */}
        <div className="col-span-3 space-y-6">
          {/* 우측 상단 Validator Overview */}
          <ValidatorOverview />
          
          {/* 우측 하단 Validator Info */}
          <ValidatorInfo 
            validator={selectedValidator}
            validatorAnalysis={validatorAnalysis || {}}
            chainProposals={chainProposals || {}}
          />
        </div>
      </div>
    </div>
  );
}; 