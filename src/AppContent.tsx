import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChainSection } from './components/chain/ChainSection';
import { ValidatorOverview } from './components/validator/ValidatorOverview';
import { ValidatorInfo } from './components/validator/ValidatorInfo';
import { 
  ValidatorAnalysis, 
  ChainProposals
} from './types';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { ProposalList } from './components/proposal/ProposalList';
import { ValidatorSummary } from './components/validator/ValidatorSummary';
import { ValidatorDetails } from './components/validator/ValidatorDetails';
import { setChainProposals } from './store/slices/proposalSlice';

// 상단에 CHAIN_LIST 상수 추가
const CHAIN_LIST = [
  'cosmos', 
  'juno', 
  'osmosis', 
  'stargaze', 
  'terra', 
  'kava', 
  'evmos', 
  'injective',
  'secret'  // secret 체인 추가
];

export const AppContent: React.FC = () => {
  const [validatorAnalysis, setValidatorAnalysis] = useState<ValidatorAnalysis | null>(null);
  
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const validatorChains = useAppSelector(state => state.chain.validatorChains);
  const chainProposals = useAppSelector(state => state.proposal.chainProposals);
  const dispatch = useAppDispatch();

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
    if (!selectedValidator?.voter || !effectiveChainName) {
      return {
        votingPattern: null,
        proposalData: null
      };
    }

    const validatorData = validatorAnalysis?.[selectedValidator.voter];
    const chainData = validatorData?.[effectiveChainName];
    
    return {
      votingPattern: chainData?.votingPattern || null,
      proposalData: chainProposals[effectiveChainName]?.proposals || null
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
  const loadData = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // 1. validator analysis 로드
      const analysisResponse = await fetch('/data/analysis/validator_analysis.json');
      if (!analysisResponse.ok) throw new Error('Failed to load validator analysis');
      const analysisData: ValidatorAnalysis = await analysisResponse.json();
      setValidatorAnalysis(analysisData);

      // 2. proposal 데이터 로드
      const proposalDataByChain: ChainProposals = {};
      await Promise.all(CHAIN_LIST.map(async (chain) => {
        try {
          const response = await fetch(`/data/analysis/proposal_analysis/${chain.toLowerCase()}.json`);
          if (!response.ok) throw new Error(`Failed to load data for ${chain}`);
          
          const data = await response.json();
          proposalDataByChain[chain] = {
            proposals: data.proposals,
            totalCount: Object.keys(data.proposals).length
          };
        } catch (error) {
          console.error(`Error loading data for ${chain}:`, error);
          proposalDataByChain[chain] = { proposals: {}, totalCount: 0 };
        }
      }));

      dispatch(setChainProposals(proposalDataByChain));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, dispatch]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // props 객체들을 useMemo로 최적화
  // const validatorInfoProps = useMemo(() => ({
  //   validator: selectedValidator,
  //   validatorAnalysis: validatorAnalysis || {},
  //   chainProposals: chainProposals,
  //   chainName: effectiveChainName,
  //   validatorName: selectedValidator?.voter || ''
  // }), [selectedValidator, validatorAnalysis, chainProposals, effectiveChainName]);

  const validatorSummaryProps = useMemo(() => ({
    chainName: effectiveChainName,
    validatorName: selectedValidator?.voter || ''
  }), [effectiveChainName, selectedValidator]);

  // const validatorDetailsProps = useMemo(() => ({
  //   votingPattern,
  //   proposalData,
  //   validatorName: selectedValidator?.voter || ''
  // }), [votingPattern, proposalData, selectedValidator]);

  return (
    <div className="h-screen overflow-hidden bg-gray-50 flex flex-col">
      <header className="bg-white shadow shrink-0 h-[--header-height]">
        <div className="h-full mx-auto px-[--content-padding-x] flex items-center">
          <h1 className="text-3xl font-bold text-gray-900">Find Better Friends</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 mx-auto px-[--content-padding-x] pt-4 pb-6 w-full">
        <div className="h-full grid grid-cols-12 gap-4">
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
                proposals={chainProposals[selectedChain!]?.proposals || null}
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