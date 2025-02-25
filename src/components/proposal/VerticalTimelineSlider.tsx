import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { ProposalData } from '../../types';

interface VerticalTimelineSliderProps {
  proposals: { [key: string]: ProposalData };
  timeRange: [number, number];
  selectedRange: [number, number];
  width?: number;
  onRangeChange: (newRange: [number, number]) => void;
}

export const VerticalTimelineSlider: React.FC<VerticalTimelineSliderProps> = ({ 
  proposals, 
  timeRange,
  selectedRange,
  width = 40,
  onRangeChange 
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);

  const bars = useMemo(() => {
    const [minTime, maxTime] = timeRange;
    
    // 월별 그룹화를 위한 함수
    const getMonthKey = (timestamp: number) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${date.getMonth() + 1}`;
    };
    
    // 전체 시간 범위에 포함된 모든 월 계산
    const allMonths: { [key: string]: { start: number, end: number, centerTime: number, count?: number } } = {};
    
    // 시작 날짜와 종료 날짜 기준으로 모든 월 생성
    const startDate = new Date(minTime);
    const endDate = new Date(maxTime);
    
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    
    // 모든 월 범위 생성 (데이터 유무와 관계없이)
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = (year === startYear) ? startMonth : 0;
      const monthEnd = (year === endYear) ? endMonth : 11;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        const monthStartTime = new Date(year, month, 1).getTime();
        const monthEndTime = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
        const monthKey = `${year}-${month + 1}`;
        
        allMonths[monthKey] = {
          start: Math.max(monthStartTime, minTime),
          end: Math.min(monthEndTime, maxTime),
          centerTime: (monthStartTime + monthEndTime) / 2,
        };
      }
    }
    
    // 월별 시작 및 종료 시간 계산 (제안서 카운트 추가)
    const monthRanges = { ...allMonths };
    
    // 모든 제안서를 월별로 그룹화하여 카운트
    Object.values(proposals).forEach(proposal => {
      const timestamp = proposal.timeVotingStart;
      if (timestamp >= minTime && timestamp <= maxTime) {
        const monthKey = getMonthKey(timestamp);
        
        if (monthRanges[monthKey]) {
          if (!monthRanges[monthKey].hasOwnProperty('count')) {
            monthRanges[monthKey].count = 1;
          } else {
            monthRanges[monthKey].count = (monthRanges[monthKey].count || 0) + 1;
          }
        }
      }
    });
    
    // 카운트가 없는 월에는 0 설정
    Object.keys(monthRanges).forEach(key => {
      if (!monthRanges[key].hasOwnProperty('count')) {
        monthRanges[key].count = 0;
      }
    });
    
    // 월별 데이터를 배열로 변환하고 날짜순으로 정렬 (최신이 상단에 오도록 역순)
    const monthsArray = Object.entries(monthRanges)
      .map(([key, data]) => ({
        key,
        ...data
      }))
      .sort((a, b) => b.start - a.start); // 역순 정렬 (최신이 상단에)
    
    // 최대 카운트 계산 (0이 아닌 값이 있는 경우)
    const maxCount = Math.max(...monthsArray.map(m => m.count || 0), 1);
    
    // 최종 바 데이터 생성
    return monthsArray.map(month => ({
      width: (month.count || 0) / maxCount,
      timeStart: month.start,
      timeEnd: month.end,
      centerTime: month.centerTime,
      monthKey: month.key
    }));
  }, [proposals, timeRange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!chartRef.current) return;
    
    const rect = chartRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    // 180도 회전된 로직: 위쪽(작은 Y)이 최신(큰 시간), 아래쪽(큰 Y)이 과거(작은 시간)
    const clickTime = timeRange[1] - (timeRange[1] - timeRange[0]) * (clickY / rect.height);
    
    const distToStart = Math.abs(clickTime - selectedRange[0]);
    const distToEnd = Math.abs(clickTime - selectedRange[1]);
    
    setDragStartY(e.clientY);
    setIsDragging(distToStart < distToEnd ? 'start' : 'end');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !chartRef.current || dragStartY === null) return;

    const rect = chartRef.current.getBoundingClientRect();
    const currentY = e.clientY - rect.top;
    
    // 차트 내에서의 상대적 위치 (0-1 사이 값)
    const relativePosition = currentY / rect.height;
    
    // 바가 있는 경우 해당 위치의 바 찾기
    if (bars.length > 0) {
      // 위치에 해당하는 바 인덱스 계산
      const barIndex = Math.min(
        Math.floor(relativePosition * bars.length),
        bars.length - 1
      );
      
      // 해당 바의 중앙 시간 사용
      const selectedBar = bars[barIndex];
      const newTime = selectedBar.centerTime;
      
      const newRange = [...selectedRange] as [number, number];
      if (isDragging === 'start') {
        newRange[0] = Math.min(Math.max(newTime, timeRange[0]), newRange[1]);
      } else {
        newRange[1] = Math.max(Math.min(newTime, timeRange[1]), newRange[0]);
      }
      
      onRangeChange(newRange);
    } else {
      // 바가 없는 경우 기본 계산 사용
      const currentTime = timeRange[1] - (timeRange[1] - timeRange[0]) * relativePosition;
      
      const newRange = [...selectedRange] as [number, number];
      if (isDragging === 'start') {
        newRange[0] = Math.min(Math.max(currentTime, timeRange[0]), newRange[1]);
      } else {
        newRange[1] = Math.max(Math.min(currentTime, timeRange[1]), newRange[0]);
      }
      
      onRangeChange(newRange);
    }
  }, [isDragging, dragStartY, selectedRange, timeRange, onRangeChange, bars]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    setDragStartY(null);
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
      className="h-full relative cursor-pointer"
      style={{ width }}
      onMouseDown={handleMouseDown}
    >
      {/* 바 컨테이너 - 월별 데이터 표시 */}
      <div className="flex flex-col h-full justify-between">
        {bars.map(({ width, timeStart, timeEnd, monthKey }) => (
          <div
            key={monthKey}
            className={`
              flex-1 my-px transition-all duration-200
              ${(timeEnd >= selectedRange[0] && timeStart <= selectedRange[1])
                ? 'bg-blue-500' 
                : 'bg-gray-200'
              }
            `}
            style={{ 
              width: `${width * 100}%`,
              minWidth: '1px',
              marginLeft: 'auto'
            }}
          />
        ))}
      </div>

      {/* 범위 표시 핸들 - 180도 회전된 로직 */}
      {['start', 'end'].map((type) => {
        const value = selectedRange[type === 'start' ? 0 : 1];
        
        // 해당 값에 가장 가까운 월 찾기
        let position;
        
        // 월별 데이터가 있는 경우 해당 월의 위치 사용
        if (bars.length > 0) {
          const closestBar = bars.reduce((closest, bar) => {
            const currentDiff = Math.abs(bar.centerTime - value);
            const closestDiff = Math.abs(closest.centerTime - value);
            return currentDiff < closestDiff ? bar : closest;
          });
          
          // 해당 월의 상대적 위치 계산 (인덱스 기반)
          const barIndex = bars.findIndex(bar => bar.monthKey === closestBar.monthKey);
          
          // 바 개수가 1개 이상인 경우에만 계산
          if (bars.length > 1) {
            // 각 바가 차지하는 공간의 비율 계산
            const barHeight = 100 / bars.length;
            
            // 바의 중앙 위치 계산 (상단 기준)
            position = barIndex * barHeight + (barHeight / 2);
          } else {
            // 바가 1개인 경우 중앙에 위치
            position = 50;
          }
        } else {
          // 바가 없는 경우 기본 계산 사용
          position = 100 - ((value - timeRange[0]) / (timeRange[1] - timeRange[0])) * 100;
        }
        
        return (
          <div
            key={type}
            className="absolute left-0 right-0 cursor-ns-resize"
            style={{
              top: `${position}%`,
              transform: 'translateY(-50%)',
              zIndex: 10,
              height: '1px',
              borderTop: '1px dashed #4B5563', // gray-600 색상의 점선
            }}
          />
        );
      })}
      
      {/* 날짜 표시 - 그리드 내부에 배치 */}
      <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-600 pointer-events-none">
        <div className="text-center p-1 bg-white bg-opacity-70">
          {/* 상단에 과거 날짜 (selectedRange[0]) */}
          {new Date(selectedRange[0]).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        <div className="text-center p-1 bg-white bg-opacity-70">
          {/* 하단에 최신 날짜 (selectedRange[1]) */}
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