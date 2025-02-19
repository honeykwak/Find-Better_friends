import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChainSection } from './components/chain/ChainSection';
import { ValidatorOverview } from './components/validator/ValidatorOverview';
import { ValidatorInfo } from './components/validator/ValidatorInfo';
import { 
  ValidatorAnalysis, 
  ChainProposals
} from './types';
import { useAppSelector } from './hooks/useAppSelector';
import { ProposalList } from './components/proposal/ProposalList';
import { ValidatorSummary } from './components/validator/ValidatorSummary';
import { ValidatorDetails } from './components/validator/ValidatorDetails';

export const AppContent: React.FC = () => {
  const [validatorAnalysis, setValidatorAnalysis] = useState<ValidatorAnalysis | null>(null);
  const [proposalDetails, setProposalDetails] = useState<ChainProposals | null>(null);
  
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const validatorChains = useAppSelector(state => state.chain.validatorChains);
  const chainProposals = useAppSelector(state => state.proposal.chainProposals);

  // 데이터 로딩 상태 추가
  const [isLoading, setIsLoading] = useState(false);

  // validatorAnalysis에서 validator의 체인 정보 가져오기
  const getValidatorChain = () => {
    // validator가 없거나 분석 데이터가 없으면 빈 문자열 반환
    if (!selectedValidator?.voter || !validatorAnalysis) return '';
    
    // validatorAnalysis에서 해당 validator의 체인들을 확인
    const validatorData = validatorAnalysis[selectedValidator.voter];
    if (!validatorData) return '';

    // validator가 속한 체인들 중에서 선택
    const chains = Object.keys(validatorData);
    
    // 1. selectedChain이 있고 validator가 그 체인에 속해있으면 그것을 사용
    if (selectedChain && chains.includes(selectedChain)) {
      return selectedChain;
    }
    
    // 2. validatorChains 배열에서 첫 번째 유효한 체인 사용
    const firstValidChain = validatorChains.find(chain => chains.includes(chain));
    if (firstValidChain) {
      return firstValidChain;
    }
    
    // 3. validator의 첫 번째 체인 사용
    return chains[0] || '';
  };

  // 체인 이름 결정
  const effectiveChainName = getValidatorChain();

  // voting pattern과 proposal data를 안전하게 가져오기
  const getValidatorData = () => {
    if (!selectedValidator?.voter || !effectiveChainName || !proposalDetails) {
      return {
        votingPattern: null,
        proposalData: null
      };
    }

    const validatorData = validatorAnalysis?.[selectedValidator.voter];
    const chainData = validatorData?.[effectiveChainName];
    
    // proposalDetails에서 proposals 객체를 가져옵니다
    const proposals = proposalDetails[effectiveChainName]?.proposals;

    return {
      votingPattern: chainData?.votingPattern || null,
      proposalData: proposals || null
    };
  };

  const { votingPattern, proposalData } = getValidatorData();

  console.log('AppContent Debug:', {
    selectedChain,
    validatorChains,
    selectedValidatorName: selectedValidator?.voter,
    effectiveChainName,
    hasValidatorAnalysis: !!validatorAnalysis,
    availableChains: selectedValidator ? Object.keys(validatorAnalysis?.[selectedValidator.voter] || {}) : []
  });

  // 데이터 로딩 로직 최적화
  const loadValidatorAnalysis = useCallback(async () => {
    if (validatorAnalysis || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/data/analysis/validator_analysis.json');
      if (!response.ok) throw new Error('Failed to load validator analysis');
      const data: ValidatorAnalysis = await response.json();
      setValidatorAnalysis(data);
    } catch (error) {
      console.error('Error loading validator analysis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [validatorAnalysis, isLoading]);

  const loadProposalDetails = useCallback(async (chain: string) => {
    if (!chain || proposalDetails?.[chain] || isLoading) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/data/analysis/proposal_analysis/${chain.toLowerCase()}.json`);
      if (!response.ok) throw new Error(`Failed to load proposal details for ${chain}`);
      const data = await response.json();
      setProposalDetails(prev => ({
        ...prev,
        [chain]: {
          proposals: data.proposals
        }
      }));
    } catch (error) {
      console.error('Error loading proposal details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [proposalDetails, isLoading]);

  useEffect(() => {
    loadValidatorAnalysis();
    if (selectedChain) {
      loadProposalDetails(selectedChain);
    }
  }, [selectedChain, loadValidatorAnalysis, loadProposalDetails]);

  // props 객체들을 useMemo로 최적화
  const validatorInfoProps = useMemo(() => ({
    validator: selectedValidator,
    validatorAnalysis: validatorAnalysis || {},
    chainProposals: chainProposals,
    chainName: effectiveChainName,
    validatorName: selectedValidator?.voter || ''
  }), [selectedValidator, validatorAnalysis, chainProposals, effectiveChainName]);

  const validatorSummaryProps = useMemo(() => ({
    chainName: effectiveChainName,
    validatorName: selectedValidator?.voter || ''
  }), [effectiveChainName, selectedValidator]);

  const validatorDetailsProps = useMemo(() => ({
    votingPattern,
    proposalData,
    validatorName: selectedValidator?.voter || ''
  }), [votingPattern, proposalData, selectedValidator]);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <header className="bg-white shadow shrink-0 h-[--header-height]">
        <div className="w-[--content-width] h-full mx-auto px-[--content-padding-x] flex items-center">
          <h1 className="text-3xl font-bold text-gray-900">Find Better Friends</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 w-[--content-width] mx-auto px-[--content-padding-x] pt-4 pb-6">
        <div className="h-full grid grid-cols-12 gap-4 px-4">
          {/* Chain Section */}
          <div className="col-span-2 min-h-0 h-[calc(100%+1rem)]">
            <div className="component-container h-full">
              <ChainSection />
            </div>
          </div>

          {/* Validator Overview Section */}
          <div className="col-span-5 min-h-0 h-full grid grid-rows-[65%_35%] gap-4">
            <div className="component-container">
              <ValidatorOverview />
            </div>
            <div className="grid grid-cols-2 gap-4 min-h-0">
              <div className="component-container min-h-0 flex flex-col">
                <ValidatorInfo
                  validator={selectedValidator}
                  validatorAnalysis={validatorAnalysis || {}}
                  chainProposals={chainProposals}
                  chainName={effectiveChainName}
                  validatorName={selectedValidator?.voter || ''}
                />
              </div>
              <div className="component-container min-h-0 flex flex-col">
                <ValidatorSummary {...validatorSummaryProps} />
              </div>
            </div>
          </div>

          {/* Proposal & Details Section */}
          <div className="col-span-5 min-h-0 h-full grid grid-rows-[65%_35%] gap-4">
            <div className="component-container">
              <ProposalList 
                chainName={selectedChain || ''}
                proposals={proposalDetails?.[selectedChain!]?.proposals || null}
              />
            </div>
            <div className="component-container">
              <ValidatorDetails 
                votingPattern={votingPattern}
                proposalData={proposalData}
                validatorName={selectedValidator?.voter || ''}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 