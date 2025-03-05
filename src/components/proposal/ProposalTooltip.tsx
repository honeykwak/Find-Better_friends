import React from 'react';
import ReactDOM from 'react-dom';
import { ProposalData } from '../../types';
import { formatDate } from '../../utils/date';

interface ProposalTooltipProps {
  proposal: ProposalData;
  position: { x: number; y: number };
}

export const ProposalTooltip: React.FC<ProposalTooltipProps> = ({ proposal, position }) => {
  // 투표 비율을 퍼센트로 변환
  const formatRatio = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
  
  return ReactDOM.createPortal(
    <div 
      className="fixed z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm"
      style={{ 
        left: position.x + 10, 
        top: position.y + 10,
        pointerEvents: 'none'
      }}
    >
      {/* 제목 */}
      <h3 className="font-medium text-gray-900 mb-2">{proposal.title}</h3>
      
      {/* 카테고리 정보 */}
      <div className="flex gap-2 mb-2">
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
          {proposal.main_category}
        </span>
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
          {proposal.sub_category}
        </span>
      </div>

      {/* 상태 및 타입 */}
      <div className="flex gap-2 mb-3">
        <span className={`text-xs px-2 py-1 rounded ${
          proposal.status === 'PASSED' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {proposal.status}
        </span>
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
          {proposal.type.split('.').pop()}
        </span>
      </div>

      {/* 투표 결과 */}
      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-green-600">Yes</span>
          <span>{formatRatio(proposal.ratios.YES)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-600">No</span>
          <span>{formatRatio(proposal.ratios.NO)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-orange-600">No With Veto</span>
          <span>{formatRatio(proposal.ratios.NO_WITH_VETO)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Abstain</span>
          <span>{formatRatio(proposal.ratios.ABSTAIN)}</span>
        </div>
      </div>

      {/* 투표 기간 */}
      <div className="text-xs text-gray-500">
        <div>Voting Start: {formatDate(proposal.timeVotingStart)}</div>
        <div>Voting End: {formatDate(proposal.timeVotingEnd)}</div>
        <div className="mt-1">Total Votes: {proposal.total_votes}</div>
      </div>
    </div>,
    document.body
  );
}; 