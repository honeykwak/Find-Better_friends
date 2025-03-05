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
import { setVotingPatterns } from './store/slices/votingPatternsSlice';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const selectedValidator = useAppSelector(state => state.validator.selectedValidator);
  const selectedChain = useAppSelector(state => state.chain.selectedChain);
  const validatorChains = useAppSelector(state => state.chain.validatorChains);
  const chainProposals = useAppSelector(state => state.proposal.chainProposals);
  const dispatch = useAppDispatch();

  // getValidatorChain 함수를 useMemo로 최적화
  const effectiveChainName = useMemo(() => {
    // validator가 없거나 분석 데이터가 없으면 빈 문자열 반환
    if (!selectedValidator?.voter || !validatorAnalysis) return '';
    
    // validatorAnalysis에서 해당 validator의 체인들을 확인
    const validatorData = validatorAnalysis[selectedValidator.voter];
    if (!validatorData) return '';

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
  }, [selectedValidator, validatorAnalysis, selectedChain, validatorChains]);

  // 디버그 로그를 useEffect로 이동하고 의존성 배열 최적화
  useEffect(() => {
    console.log('AppContent Debug:', {
      selectedChain,
      validatorChains,
      selectedValidatorName: selectedValidator?.voter,
      effectiveChainName,
      hasValidatorAnalysis: !!validatorAnalysis,
      availableChains: selectedValidator ? Object.keys(validatorAnalysis?.[selectedValidator.voter] || {}) : []
    });
  }, [selectedChain, validatorChains, selectedValidator, effectiveChainName, validatorAnalysis]);

  // getValidatorData 함수를 useMemo로 최적화
  const validatorData = useMemo(() => {
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
  }, [selectedValidator, effectiveChainName, validatorAnalysis, chainProposals]);

  const { votingPattern, proposalData } = validatorData;

  // 초기 데이터 로드를 위한 useEffect
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        
        // 1. 모든 체인의 제안서 데이터 로드
        const proposalDataByChain: Record<string, any> = {};
        await Promise.all(CHAIN_LIST.map(async (chain) => {
          try {
            const response = await fetch(`/data/analysis/proposal_analysis/${chain.toLowerCase()}.json`);
            if (response.ok) {
              const data = await response.json();
              proposalDataByChain[chain] = {
                proposals: data.proposals || {},
                totalCount: Object.keys(data.proposals || {}).length
              };
            }
          } catch (error) {
            console.warn(`Error loading proposal data for ${chain}:`, error);
            proposalDataByChain[chain] = { proposals: {}, totalCount: 0 };
          }
        }));
        
        // 2. 모든 체인의 투표 패턴 데이터 로드
        const votingPatternsByChain: Record<string, any> = {};
        await Promise.all(CHAIN_LIST.map(async (chain) => {
          try {
            const response = await fetch(`/data/analysis/voting_patterns/${chain.toLowerCase()}.json`);
            if (response.ok) {
              const data = await response.json();
              votingPatternsByChain[chain] = data;
            }
          } catch (error) {
            console.warn(`Error loading voting patterns for ${chain}:`, error);
            votingPatternsByChain[chain] = {};
          }
        }));

        // 3. Redux store에 데이터 저장
        dispatch(setChainProposals(proposalDataByChain));
        dispatch(setVotingPatterns(votingPatternsByChain));

      } catch (error) {
        console.error('Error loading initial data:', error);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [dispatch]);

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

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-lg">Loading data...</div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-lg text-red-600">{error}</div>
    </div>;
  }

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
                  chainName={selectedChain || ''}
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
                proposalData={chainProposals[selectedChain!]?.proposals || null}
                validatorName={selectedValidator?.voter || ''}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}; 