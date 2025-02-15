import React from 'react';
import { ValidatorData } from '../../types';

interface ValidatorInfoProps {
  validator: ValidatorData | null;
  validatorChains: string[];
}

export const ValidatorInfo: React.FC<ValidatorInfoProps> = ({ validator, validatorChains }) => {
  if (!validator) {
    return (
      <div className="w-full bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Validator Info</h2>
        <p className="text-gray-500">Select a validator to view details</p>
      </div>
    );
  }

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
          <h3 className="font-medium text-gray-700">Raw Data:</h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-[300px] text-sm">
            {JSON.stringify(validator, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};