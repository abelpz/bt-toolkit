/**
 * Type declarations for usfm-js library
 */

declare module 'usfm-js' {
  export function toJSON(usfmText: string): any;
  export function toUSFM(jsonData: any): string;
}
