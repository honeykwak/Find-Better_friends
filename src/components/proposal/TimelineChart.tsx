import React, { useMemo } from 'react';
import { ProposalData } from '../../types';

interface TimelineChartProps {
  proposals: { [key: string]: ProposalData };
  timeRange: [number, number];
  selectedRange: [number, number];
  height?: number;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ 
  proposals, 
  timeRange,
  selectedRange,
  height = 40 
}) => {
  const bars = useMemo(() => {
    const BAR_COUNT = 50;
    const [minTime, maxTime] = timeRange;
    const timespan = maxTime - minTime;
    
    // 각 막대의 간격을 전체 시간 범위를 정확히 BAR_COUNT로 나눈 값으로 설정
    const interval = timespan / (BAR_COUNT - 1); // -1을 해서 마지막 막대가 정확히 maxTime에 위치하도록 함
    
    // 각 막대의 시간 범위 계산
    const barRanges = Array.from({ length: BAR_COUNT }, (_, i) => {
      const centerTime = minTime + (i * interval);
      const halfInterval = interval / 2;
      return {
        start: centerTime - halfInterval,
        end: centerTime + halfInterval,
        centerTime // 막대의 중심 시간 추가
      };
    });
    
    // 각 막대에 해당하는 제안 수 계산
    const frequencies = barRanges.map(range => {
      return Object.values(proposals).filter(proposal => 
        proposal.timeVotingStart >= range.start && 
        proposal.timeVotingStart <= range.end
      ).length;
    });

    const maxFreq = Math.max(...frequencies, 1); // 0으로 나누는 것 방지
    
    return barRanges.map((range, i) => ({
      height: frequencies[i] / maxFreq,
      timeStart: range.start,
      timeEnd: range.end,
      centerTime: range.centerTime
    }));
  }, [proposals, timeRange]);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex h-full items-end">
        {bars.map(({ height, centerTime }, i) => (
          <div
            key={i}
            className={`
              flex-1 mx-px transition-all duration-200
              ${centerTime >= selectedRange[0] && centerTime <= selectedRange[1]
                ? 'bg-blue-200' 
                : 'bg-gray-200'
              }
            `}
            style={{ 
              height: `${height * 100}%`,
              minHeight: '1px'
            }}
          />
        ))}
      </div>
    </div>
  );
}; 