import React from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import { ValidatorData } from '../../types';

// VOTE_COLOR_CLASSES에서 실제 색상 값 추출
const VOTE_COLORS = {
  YES: '#80b1d3',
  NO: '#fb8072',
  NO_WITH_VETO: '#fdb462',
  ABSTAIN: '#bc80bd',
  NO_VOTE: '#d9d9d9'
} as const;

interface ValidatorTooltipProps {
  voter: string;
  position: { x: number; y: number };
  scale: number;
  mapPosition: { x: number; y: number };
  votingPatterns: any;
  chainProposals: any;
  selectedProposals: string[];
  currentValidator: ValidatorData | null;
  additionalValidator: ValidatorData | null;
}

export const ValidatorTooltip: React.FC<ValidatorTooltipProps> = ({
  voter,
  position,
  scale,
  mapPosition,
  votingPatterns,
  chainProposals,
  selectedProposals,
  currentValidator,
  additionalValidator
}) => {
  // 툴크 위치 계산 로직
  const calculatePosition = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const tooltipWidth = 400;
    const tooltipHeight = 300;
    const offset = 10;

    // 맵 스케일과 위치를 고려한 실제 좌표 계산
    let left = (position.x * scale + mapPosition.x) + offset;
    let top = (position.y * scale + mapPosition.y) + offset;

    if (left + tooltipWidth > windowWidth) {
      left = left - tooltipWidth - offset * 2;
    }
    if (top + tooltipHeight > windowHeight) {
      top = top - tooltipHeight - offset * 2;
    }
    if (left < 0) left = offset;
    if (top < 0) top = offset;

    return { left, top };
  };

  // 투표 통계 계산
  const calculateVoteStats = () => {
    if (!votingPatterns || !chainProposals) return null;

    const validatorVotes = votingPatterns[voter]?.proposal_votes || {};
    const targetProposals = selectedProposals.length > 0 ? selectedProposals : Object.keys(chainProposals);
    
    const stats = {
      YES: 0,
      NO: 0,
      NO_WITH_VETO: 0,
      ABSTAIN: 0,
      NO_VOTE: 0,
      total: targetProposals.length
    };

    targetProposals.forEach(proposalId => {
      const vote = validatorVotes[proposalId]?.option;
      if (vote) {
        stats[vote === 'NOWITHVETO' ? 'NO_WITH_VETO' : vote]++;
      } else {
        stats.NO_VOTE++;
      }
    });

    return stats;
  };

  const voteStats = calculateVoteStats();
  const tooltipPosition = calculatePosition();

  // 파이 차트 설정
  const width = 100;
  const height = 100;
  const radius = Math.min(width, height) / 2;

  const pieData = voteStats ? [
    { option: 'YES', value: voteStats.YES / voteStats.total },
    { option: 'NO', value: voteStats.NO / voteStats.total },
    { option: 'NO_WITH_VETO', value: voteStats.NO_WITH_VETO / voteStats.total },
    { option: 'ABSTAIN', value: voteStats.ABSTAIN / voteStats.total },
    { option: 'NO_VOTE', value: voteStats.NO_VOTE / voteStats.total }
  ] : [];

  const pie = d3.pie<typeof pieData[0]>()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
    .innerRadius(0)
    .outerRadius(radius);

  const arcs = pie(pieData);

  return ReactDOM.createPortal(
    <div 
      className={`
        fixed z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm
        ${currentValidator?.voter === voter ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
        ${additionalValidator?.voter === voter ? 'ring-2 ring-green-500 bg-green-50' : ''}
      `}
      style={{ 
        left: tooltipPosition.left,
        top: tooltipPosition.top,
        pointerEvents: 'none'
      }}
    >
      <h3 className={`font-medium mb-2
        ${currentValidator?.voter === voter ? 'text-blue-600' : ''}
        ${additionalValidator?.voter === voter ? 'text-green-600' : ''}
      `}>
        {voter}
        {currentValidator?.voter === voter && 
          <span className="ml-2 text-xs">(Primary)</span>}
        {additionalValidator?.voter === voter && 
          <span className="ml-2 text-xs">(Additional)</span>}
      </h3>

      {voteStats && (
        <div className="flex gap-4 mb-3">
          {/* 파이 차트 */}
          <svg width={width} height={height}>
            <g transform={`translate(${width / 2},${height / 2})`}>
              {arcs.map((d, i) => (
                <path
                  key={i}
                  d={arc(d) || ''}
                  fill={VOTE_COLORS[d.data.option]}
                  stroke="#fff"
                  strokeWidth="1"
                />
              ))}
            </g>
          </svg>

          {/* 투표 통계 */}
          <div className="flex-1 space-y-1">
            {pieData.map(({ option, value }) => (
              <div key={option} className="flex justify-between text-xs">
                <span style={{ color: VOTE_COLORS[option] }}>
                  {option.replace(/_/g, ' ')}
                </span>
                <span>{`${(value * 100).toFixed(1)}% (${voteStats[option]})`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 참여 정보 */}
      <div className="text-xs text-gray-500">
        <div>Total Proposals: {voteStats?.total || 0}</div>
        <div>Participation Rate: {voteStats ? 
          `${((1 - voteStats.NO_VOTE / voteStats.total) * 100).toFixed(1)}%` : 
          '0%'}
        </div>
      </div>
    </div>,
    document.body
  );
}; 