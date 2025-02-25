import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ProposalData } from '../../types';

interface TimelineChartProps {
  proposals: { [key: string]: ProposalData };
  timeRange: [number, number];
  selectedRange: [number, number];
  height?: number;
  onRangeChange: (newRange: [number, number]) => void;
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ 
  proposals, 
  timeRange,
  selectedRange,
  height = 40,
  onRangeChange 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const bars = useMemo(() => {
    const BAR_COUNT = 50;
    const [minTime, maxTime] = timeRange;
    const timespan = maxTime - minTime;
    
    const interval = timespan / (BAR_COUNT - 1);
    
    const barRanges = Array.from({ length: BAR_COUNT }, (_, i) => {
      const centerTime = minTime + (i * interval);
      const halfInterval = interval / 2;
      return {
        start: centerTime - halfInterval,
        end: centerTime + halfInterval,
        centerTime
      };
    });
    
    const frequencies = barRanges.map(range => {
      return Object.values(proposals).filter(proposal => 
        proposal.timeVotingStart >= range.start && 
        proposal.timeVotingStart <= range.end
      ).length;
    });

    const maxFreq = Math.max(...frequencies, 1);
    
    return barRanges.map((range, i) => ({
      height: frequencies[i] / maxFreq,
      timeStart: range.start,
      timeEnd: range.end,
      centerTime: range.centerTime
    }));
  }, [proposals, timeRange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = timeRange[0] + (timeRange[1] - timeRange[0]) * (clickX / rect.width);
    
    const distToStart = Math.abs(clickTime - selectedRange[0]);
    const distToEnd = Math.abs(clickTime - selectedRange[1]);
    
    setDragStartX(e.clientX);
    setIsDragging(distToStart < distToEnd ? 'start' : 'end');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !chartRef.current || dragStartX === null) return;

    const rect = chartRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentTime = timeRange[0] + (timeRange[1] - timeRange[0]) * (currentX / rect.width);
    
    const newRange = [...selectedRange] as [number, number];
    if (isDragging === 'start') {
      newRange[0] = Math.max(timeRange[0], Math.min(currentTime, selectedRange[1] - 86400000));
    } else {
      newRange[1] = Math.min(timeRange[1], Math.max(currentTime, selectedRange[0] + 86400000));
    }
    
    onRangeChange(newRange);
  }, [isDragging, dragStartX, selectedRange, timeRange, onRangeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragStartX(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={chartRef}
      className="w-full relative cursor-pointer"
      style={{ height }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex h-full items-end">
        {bars.map(({ height, centerTime }, i) => (
          <div
            key={i}
            className={`
              flex-1 mx-px transition-all duration-200
              ${centerTime >= selectedRange[0] && centerTime <= selectedRange[1]
                ? 'bg-blue-500' 
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

      {/* 범위 표시 핸들 스타일 변경 */}
      {['start', 'end'].map((type) => (
        <div
          key={type}
          className="absolute top-0 bottom-0 cursor-ew-resize"
          style={{
            left: `${((selectedRange[type === 'start' ? 0 : 1] - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100}%`,
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: '1px',
            borderLeft: '1px dashed #4B5563', // gray-600 색상의 점선
          }}
        />
      ))}
      
      {/* 날짜 표시 추가 - 영어 날짜 형식으로 변경 */}
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <div>
          {new Date(selectedRange[0]).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        <div>
          {new Date(selectedRange[1]).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
}; 