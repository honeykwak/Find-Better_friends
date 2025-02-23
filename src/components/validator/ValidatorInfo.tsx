// import React, { useEffect, useState, memo } from 'react';
import { memo } from 'react';
// import { ValidatorData, ValidatorVotingPattern, ProposalData, ChainProposals } from '../../types';
import { ValidatorData, ValidatorVotingPattern, ChainProposals } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../store';
// import { ValidatorSummary } from './ValidatorSummary';
// import { ValidatorDetails } from './ValidatorDetails';

interface ChainAnalysis {
  Operation_Time_Days: number;
  Voting_Power: number;
  Votes_Participation_Count: number;
  Yes_Rate: number;
  No_Rate: number;
  Veto_Rate: number;
  Abstain_Rate: number;
  No_Vote_Rate: number;
}

interface ValidatorInfoProps {
  validator: ValidatorData | null;
  validatorAnalysis: {
    [validator: string]: {
      [chain: string]: ChainAnalysis & {
        votingPattern?: ValidatorVotingPattern;
      };
    };
  };
  chainProposals: ChainProposals;
  chainName: string;
  validatorName: string;
}

const formatRate = (rate: number): string => {
  return rate ? `${(rate * 100).toFixed(2)}%` : '-';
};

const formatParticipationRate = (
  participationCount: number, 
  chainId: string,
  chainProposals: ChainProposals
): string => {
  if (!chainProposals || !chainProposals[chainId]) {
    return `0% (${participationCount}/0)`;
  }

  const totalProposals = Object.keys(chainProposals[chainId]?.proposals || {}).length;
  const rate = ((participationCount / totalProposals) * 100).toFixed(2);
  return `${rate}% (${participationCount}/${totalProposals})`;
};

export const ValidatorInfo: React.FC<ValidatorInfoProps> = ({ 
  validator, 
  validatorAnalysis,
  chainProposals,
  chainName,
  validatorName
}) => {
  const selectedChain = useAppSelector((state: RootState) => state.chain.selectedChain);
  // const effectiveChainName = chainName || selectedChain || '';

  return (
    <div className="h-full bg-white rounded-lg shadow-lg p-4 flex flex-col min-h-0">
      <h2 className="flex-none text-xl font-semibold mb-4">Validator Info</h2>
      <div className="flex-1 min-h-0 overflow-auto">
        {!validator || !chainName || !validatorName ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Select a validator to view information</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-auto">
              <p className="text-lg">{validator.voter}</p>
            </div>

            <div>
              {validatorAnalysis[validator.voter] ? (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {Object.entries(validatorAnalysis[validator.voter])
                    .filter(([chain]) => !selectedChain || chain === selectedChain)
                    .map(([chain, data]) => (
                      <div key={chain} className="space-y-2">
                        <div className="grid grid-cols-2 gap-x-4 text-sm">
                          <div>Operation Time:</div>
                          <div>+ {data.Operation_Time_Days.toFixed(2)}</div>
                          
                          <div>Voting Power:</div>
                          <div>{(data.Voting_Power * 100).toFixed(4)}</div>
                          
                          <div>Votes Participation:</div>
                          <div>
                            {formatParticipationRate(
                              data.Votes_Participation_Count,
                              chain,
                              chainProposals || {}
                            )}
                          </div>
                          
                          <div>Voting Pattern:</div>
                          <div className="space-y-1">
                            <div>Yes: {formatRate(data.Yes_Rate)}</div>
                            <div>No: {formatRate(data.No_Rate)}</div>
                            <div>Veto: {formatRate(data.Veto_Rate)}</div>
                            <div>Abstain: {formatRate(data.Abstain_Rate)}</div>
                            <div>No Vote: {formatRate(data.No_Vote_Rate)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">No analysis data available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ValidatorInfo, (prevProps, nextProps) => {
  return prevProps.validator?.voter === nextProps.validator?.voter &&
         prevProps.chainName === nextProps.chainName &&
         prevProps.validatorName === nextProps.validatorName;
});