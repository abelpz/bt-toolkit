// Quick test for markdown parsing
import { markdownRenderer } from './src/services/markdown-renderer';

const testContent = `This phrase introduces the first half of the story of Jonah. This is a common way of beginning a historical story about a prophet. Most languages would not begin a story with a conjunction such as **And**. Use a word, phrase, or other method in your language that is natural for introducing a new event. The repetition of this same phrase introduces the second half of the story ([3:1](../03/01.md)).`;

console.log('Testing markdown parsing...');
console.log('Input:', testContent);
console.log('\n');

const elements = markdownRenderer.parse(testContent);
console.log('Parsed elements:', JSON.stringify(elements, null, 2));

const html = markdownRenderer.renderMarkdownToHTML(testContent);
console.log('\nHTML output:', html);

const stats = markdownRenderer.getStats(testContent);
console.log('\nStats:', stats);
