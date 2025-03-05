import { store } from '../store';
import { AiSettings } from '../types';

export class DataLoader {
  private settings: AiSettings;
  private cache: Map<string, {data: any, timestamp: number}>;

  constructor(settings: AiSettings) {
    this.settings = settings;
    this.cache = new Map();
  }

  async loadAllData() {
    const { chains, dataSources } = this.settings.dataLoading;
    
    // 로딩 진행률 추적
    let loadedCount = 0;
    const totalItems = chains.length * 2 + 1; // proposals + voting patterns + coordinates

    try {
      // 1. coordinates 데이터 로드 (가장 중요)
      await this.loadCoordinates();
      this.updateProgress(++loadedCount, totalItems);

      // 2. 체인별 데이터 병렬 로드
      await Promise.all(chains.map(async chain => {
        // 제안서 데이터
        await this.loadChainData('chainProposals', chain);
        this.updateProgress(++loadedCount, totalItems);

        // 투표 패턴 데이터
        await this.loadChainData('votingPatterns', chain);
        this.updateProgress(++loadedCount, totalItems);
      }));

    } catch (error) {
      console.error('Error in initial data load:', error);
      throw error;
    }
  }

  private updateProgress(current: number, total: number) {
    const progress = (current / total) * 100;
    // 진행률 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('dataLoadProgress', { 
      detail: { progress } 
    }));
  }
} 