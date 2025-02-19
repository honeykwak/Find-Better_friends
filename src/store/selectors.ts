import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './index';

// 체인별 proposal 셀렉터
export const selectChainProposals = (state: RootState, chainId: string) => {
  const proposals = state.proposal.chainProposals[chainId]?.proposals || {};
  return Object.entries(proposals);
};

// 체인별 선택된 proposals 셀렉터 (개선)
export const selectSelectedProposalsByChain = createSelector(
  [(state: RootState) => state.proposal.selectedProposalsByChain,
   (_, chainId: string) => chainId],
  (selectedProposalsByChain, chainId) => {
    const selected = selectedProposalsByChain[chainId];
    return selected ? [...selected] : []; // 새로운 배열 참조 반환
  }
);

// 체인 정보 셀렉터
export const selectChainInfo = createSelector(
  [(state: RootState) => state.chain.selectedChain,
   (state: RootState) => state.chain.validatorChains],
  (selectedChain, validatorChains) => ({
    selectedChain,
    validatorChains
  })
);

// validator 정보 셀렉터
export const selectValidatorInfo = createSelector(
  [(state: RootState) => state.validator.selectedValidator],
  (selectedValidator) => selectedValidator
); 