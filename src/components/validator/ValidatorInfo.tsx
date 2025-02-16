import React from 'react';
import { ValidatorData } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../store';

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

interface ValidatorAnalysis {
  [chain: string]: ChainAnalysis;
}

interface ChainProposals {
  [chain: string]: number;
}

interface ValidatorInfoProps {
  validator: ValidatorData | null;
  validatorChains: string[];
  validatorAnalysis: Record<string, ValidatorAnalysis>;
  chainProposals: ChainProposals;
}

const formatRate = (rate: number): string => {
  return rate ? `${(rate * 100).toFixed(2)}%` : '-';
};

const formatParticipationRate = (participationCount: number, totalProposals: number): string => {
  const rate = totalProposals ? ((participationCount / totalProposals) * 100).toFixed(2) : '0';
  return `${rate}% (${participationCount}/${totalProposals})`;
};

export const ValidatorInfo: React.FC<ValidatorInfoProps> = ({ 
  validator, 
  validatorChains,
  validatorAnalysis,
  chainProposals 
}) => {
  const selectedChain = useAppSelector((state: RootState) => state.chain.selectedChain);

  if (!validator) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Validator Info</h2>
        <p className="text-gray-500">Select a validator to view details</p>
      </div>
    );
  }

  const analysis = validatorAnalysis[validator.voter] || {};

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Validator Info</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-700">Validator:</h3>
          <p className="text-lg">{validator.voter}</p>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700">Active Chains:</h3>
          <div className="flex flex-wrap gap-2">
            {validatorChains.map(chain => (
              <span 
                key={chain}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-gray-700">Validator Analysis</h3>
          {analysis ? (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              {Object.entries(analysis)
                .filter(([chain]) => !selectedChain || chain === selectedChain)
                .map(([chain, data]) => (
                  <div key={chain} className="space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                      <div>Operation Time:</div>
                      <div>+ {data.Operation_Time_Days.toFixed(2)}</div>
                      
                      <div>Voting Power:</div>
                      <div>{(data.Voting_Power * 100).toFixed(4)}</div>
                      
                      <div>Votes Participation:</div>
                      <div>
                        {data.Votes_Participation_Count}/{chainProposals[chain] || 0} (
                        {((data.Votes_Participation_Count / (chainProposals[chain] || 1)) * 100).toFixed(2)}%)
                      </div>
                      
                      <div>Voting Pattern:</div>
                      <div className="space-y-1">
                        <div>Yes: {(data.Yes_Rate * 100).toFixed(2)}%</div>
                        <div>No: {(data.No_Rate * 100).toFixed(2)}%</div>
                        <div>Veto: {(data.Veto_Rate * 100).toFixed(2)}%</div>
                        <div>Abstain: {(data.Abstain_Rate * 100).toFixed(2)}%</div>
                        <div>No Vote: {(data.No_Vote_Rate * 100).toFixed(2)}%</div>
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
    </div>
  );
};