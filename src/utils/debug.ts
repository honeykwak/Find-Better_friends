export const DEBUG = process.env.NODE_ENV === 'development';

export const debugLog = (component: string, data: any) => {
  if (DEBUG) {
    console.log(`${component} Debug:`, data);
  }
}; 