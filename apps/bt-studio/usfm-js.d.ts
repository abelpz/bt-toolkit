/**
 * Type declarations for usfm-js library
 */

declare module 'usfm-js' {
  export interface USFMParseOptions {
    chapter_label?: string;
    verse_label?: string;
    include_markers?: boolean;
  }

  export interface USFMToken {
    type: string;
    marker?: string;
    content?: string;
    text?: string;
    number?: number;
    caller?: string;
    preview?: string;
    tag?: string;
    endTag?: string;
    attributes?: any[];
    children?: USFMToken[];
  }

  export interface USFMHeader {
    tag?: string;
    content?: string;
    type?: string;
    text?: string;
  }

  export function toJSON(usfmText: string, options?: USFMParseOptions): {
    headers: USFMHeader[];
    chapters: any[];
    verses: any[];
  };

  export function toUSFM(jsonData: any, options?: any): string;
  
  export function removeMarker(usfmText: string, marker: string): string;
  
  export function filter(jsonData: any, options: any): any;
}
