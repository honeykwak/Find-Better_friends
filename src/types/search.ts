export interface SearchResult<T = any> {
  id: string;
  text: string;
  data?: T;
} 