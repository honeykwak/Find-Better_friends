import { ClusterType } from '../types';

export interface CoordinateData {
  voter: string;
  x: number;
  y: number;
  cluster: ClusterType;
}

export interface ChainCoordinateData {
  voter: string;
  mds_x: number;
  mds_y: number;
  tsne_x: number;
  tsne_y: number;
  cluster: ClusterType;
}

export const loadCoordinates = async (): Promise<{
  globalCoordinates: CoordinateData[];
  chainCoordinates: Record<string, ChainCoordinateData[]>;
}> => {
  try {
    const response = await fetch('/src/data/coordinates/data.pkl');
    const data = await response.json();
    
    // 전체 좌표 변환
    const globalCoordinates = data.coords_dict.onehot[0].map((row: any) => ({
      voter: row.voter,
      x: row.x,
      y: row.y,
      cluster: row.cluster as ClusterType
    }));

    // 체인별 좌표 변환
    const chainCoordinates = Object.entries(data.chain_coords_dict).reduce(
      (acc, [chainName, coords]: [string, any]) => ({
        ...acc,
        [chainName]: coords.map((row: any) => ({
          voter: row.voter,
          mds_x: row.mds_x,
          mds_y: row.mds_y,
          tsne_x: row.tsne_x,
          tsne_y: row.tsne_y,
          cluster: row.cluster as ClusterType
        }))
      }),
      {}
    );

    return { globalCoordinates, chainCoordinates };
  } catch (error) {
    console.error('Error loading coordinates:', error);
    return { globalCoordinates: [], chainCoordinates: {} };
  }
};