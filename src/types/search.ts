export interface SearchResult<T = any> {
  id: string;
  text: string;
  subText?: string;
  data?: T;
} 