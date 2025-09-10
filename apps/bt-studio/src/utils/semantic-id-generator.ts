/**
 * Semantic ID Generator Utility
 * Generates deterministic numeric IDs for original language tokens
 * ensuring cross-panel compatibility
 */

/**
 * Generates a semantic ID for an original language token
 * The same content + strong + verseRef will always produce the same ID
 * across all panels and processing sessions
 * 
 * @param content - The original language word content (e.g., "Παῦλος")
 * @param strong - The Strong's number (e.g., "G39720")
 * @param verseRef - The verse reference (e.g., "tit 1:1")
 * @returns A deterministic numeric ID
 */
export function generateSemanticId(content: string, strong: string, verseRef: string): number {
  const input = `${verseRef}:${content}:${strong}`;
  let hash = 0;
  
  // Simple but effective hash function
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Return positive integer within reasonable range
  return Math.abs(hash) % 1000000;
}

/**
 * Generates a semantic ID with occurrence support
 * For cases where the same word appears multiple times in a verse
 * 
 * @param content - The original language word content
 * @param strong - The Strong's number
 * @param verseRef - The verse reference
 * @param occurrence - The occurrence number (1-based)
 * @returns A deterministic numeric ID that includes occurrence
 */
export function generateSemanticIdWithOccurrence(
  content: string, 
  strong: string, 
  verseRef: string, 
  occurrence: number = 1
): number {
  const input = `${verseRef}:${content}:${strong}:${occurrence}`;
  let hash = 0;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash) % 1000000;
}

/**
 * Validates that a semantic ID is within expected range
 * @param id - The semantic ID to validate
 * @returns true if valid, false otherwise
 */
export function isValidSemanticId(id: number): boolean {
  return Number.isInteger(id) && id >= 0 && id < 1000000;
}

/**
 * Batch generates semantic IDs for multiple tokens
 * Useful for processing entire verses or chapters
 * 
 * @param tokens - Array of token data
 * @returns Map of semantic IDs keyed by token identifier
 */
export function batchGenerateSemanticIds(tokens: Array<{
  content: string;
  strong: string;
  verseRef: string;
  occurrence?: number;
}>): Map<string, number> {
  const idMap = new Map<string, number>();
  
  for (const token of tokens) {
    const key = `${token.verseRef}:${token.content}:${token.strong}:${token.occurrence || 1}`;
    const id = generateSemanticIdWithOccurrence(
      token.content, 
      token.strong, 
      token.verseRef, 
      token.occurrence || 1
    );
    idMap.set(key, id);
  }
  
  return idMap;
}

/**
 * Creates a lookup key for semantic ID mapping
 * @param content - The word content
 * @param strong - The Strong's number
 * @param verseRef - The verse reference
 * @param occurrence - The occurrence number
 * @returns A standardized lookup key
 */
export function createSemanticIdKey(
  content: string, 
  strong: string, 
  verseRef: string, 
  occurrence: number = 1
): string {
  return `${verseRef}:${content}:${strong}:${occurrence}`;
}

/**
 * Performance test function for semantic ID generation
 * Used for benchmarking and optimization
 */
export function benchmarkSemanticIdGeneration(iterations: number = 10000): {
  totalTime: number;
  avgTime: number;
  idsPerSecond: number;
} {
  const testData = [
    { content: 'Παῦλος', strong: 'G39720', verseRef: 'tit 1:1' },
    { content: 'δοῦλος', strong: 'G14010', verseRef: 'tit 1:1' },
    { content: 'Θεοῦ', strong: 'G23160', verseRef: 'tit 1:1' },
    { content: 'Ἰησοῦ', strong: 'G24240', verseRef: 'tit 1:1' },
    { content: 'Χριστοῦ', strong: 'G55470', verseRef: 'tit 1:1' }
  ];
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    for (const token of testData) {
      generateSemanticId(token.content, token.strong, token.verseRef);
    }
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const idsPerSecond = (testData.length * iterations) / (totalTime / 1000);
  
  return {
    totalTime,
    avgTime,
    idsPerSecond: Math.round(idsPerSecond)
  };
}

