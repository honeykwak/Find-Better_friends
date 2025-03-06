import React from 'react';
import ReactDOM from 'react-dom';
import * as d3 from 'd3';
import { ProposalData } from '../../types';
import { formatDate } from '../../utils/date';
import { VOTE_COLOR_CLASSES } from '../../constants';

interface ProposalTooltipProps {
  proposal: ProposalData;
  position: { x: number; y: number };
}

// VOTE_COLOR_CLASSES에서 실제 색상 값 추출
const VOTE_COLORS = {
  YES: '#80b1d3',
  NO: '#fb8072',
  NO_WITH_VETO: '#fdb462',
  ABSTAIN: '#bc80bd',
  NO_VOTE: '#d9d9d9'
} as const;

export const ProposalTooltip: React.FC<ProposalTooltipProps> = ({ proposal, position }) => {
  // 투표 비율을 퍼센트로 변환
  const formatRatio = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
  
  // 방어적 프로그래밍: ratios가 없으면 기본값 사용
  const ratios = proposal.ratios || {
    YES: 0,
    NO: 0,
    NO_WITH_VETO: 0,
    ABSTAIN: 0
  };
  
  // 파이 차트 데이터 준비 - NO_VOTE 추가
  const votedRatioSum = ratios.YES + 
                       ratios.NO + 
                       ratios.NO_WITH_VETO + 
                       ratios.ABSTAIN;
  
  const pieData = [
    { option: 'YES', value: ratios.YES },
    { option: 'NO', value: ratios.NO },
    { option: 'NO_WITH_VETO', value: ratios.NO_WITH_VETO },
    { option: 'ABSTAIN', value: ratios.ABSTAIN },
    { option: 'NO_VOTE', value: Math.max(0, 1 - votedRatioSum) } // 음수 방지
  ];

  // 파이 차트 설정
  const width = 100;
  const height = 100;
  const radius = Math.min(width, height) / 2;

  // SVG 생성
  const pie = d3.pie<typeof pieData[0]>()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc<d3.PieArcDatum<typeof pieData[0]>>()
    .innerRadius(0)
    .outerRadius(radius);

  const arcs = pie(pieData);

  // 툴팁 위치 계산 로직 추가
  const calculatePosition = () => {
    // 브라우저 창 크기
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // 툴팁의 예상 크기 (최대 너비와 대략적인 높이)
    const tooltipWidth = 400; // max-w-sm = 24rem = 384px
    const tooltipHeight = 300; // 대략적인 높이

    // 기본 오프셋
    const offset = 10;

    // 기본 위치 (우측 하단)
    let left = position.x + offset;
    let top = position.y + offset;

    // 우측 경계 체크
    if (left + tooltipWidth > windowWidth) {
      // 왼쪽에 표시
      left = position.x - tooltipWidth - offset;
    }

    // 하단 경계 체크
    if (top + tooltipHeight > windowHeight) {
      // 위에 표시
      top = position.y - tooltipHeight - offset;
    }

    // 왼쪽 경계 체크 (왼쪽으로 넘어갈 경우)
    if (left < 0) {
      left = offset;
    }

    // 상단 경계 체크 (위로 넘어갈 경우)
    if (top < 0) {
      top = offset;
    }

    return { left, top };
  };

  const tooltipPosition = calculatePosition();

  return ReactDOM.createPortal(
    <div 
      className="fixed z-50 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm"
      style={{ 
        left: tooltipPosition.left,
        top: tooltipPosition.top,
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

      {/* 투표 결과 섹션을 flex로 변경 */}
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

        {/* 투표 비율 텍스트 - 색상도 파이 차트와 동일하게 적용 */}
        <div className="flex-1 space-y-1">
          {pieData.map(({ option, value }) => (
            <div key={option} className="flex justify-between text-xs">
              <span style={{ color: VOTE_COLORS[option] }}>
                {option.replace(/_/g, ' ')}
              </span>
              <span>{formatRatio(value)}</span>
            </div>
          ))}
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