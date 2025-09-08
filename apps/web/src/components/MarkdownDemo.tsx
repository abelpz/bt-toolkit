/**
 * Markdown Demo Component
 * 
 * A demo component to showcase the markdown rendering capabilities
 * for translation notes. This can be used for testing and documentation.
 */

import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

const sampleMarkdownContent = `# Translation Note Example

This phrase introduces the first half of the story of Jonah. This is a common way of beginning a historical story about a prophet. Most languages would not begin a story with a conjunction such as **"And"**. Use a word, phrase, or other method in your language that is natural for introducing a new event.

## Key Points

- Use *natural* language patterns
- Avoid literal translations of conjunctions
- Consider your target audience

### Technical Details

The repetition of this same phrase introduces the second half of the story (\`[3:1](./03/01.md)\`).

**Important:** This is a [reference link](https://example.com) to additional resources.

Some \`inline code\` examples and **bold text** with *italic emphasis*.

## Lists Example

- First item with **bold** text
- Second item with *italic* text  
- Third item with \`code\` snippet
- Fourth item with [a link](https://door43.org)

*Note: This is sample content for demonstration purposes.*`;

export const MarkdownDemo: React.FC = () => {
  const [showStats, setShowStats] = useState(false);
  const [mode, setMode] = useState<'react' | 'html'>('react');
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Markdown Renderer Demo</h2>
        
        {/* Controls */}
        <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Mode:</label>
            <select 
              value={mode} 
              onChange={(e) => setMode(e.target.value as 'react' | 'html')}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="react">React Elements</option>
              <option value="html">HTML (dangerouslySetInnerHTML)</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="showStats" 
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
            />
            <label htmlFor="showStats" className="text-sm font-medium">Show Stats</label>
          </div>
        </div>
        
        {/* Rendered Content */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Rendered Output ({mode} mode):</h3>
          <div className="bg-white p-4 rounded border">
            <MarkdownRenderer 
              content={sampleMarkdownContent}
              mode={mode}
              showStats={showStats}
              headerBaseLevel={3}
              linkTarget="_blank"
            />
          </div>
        </div>
        
        {/* Raw Markdown */}
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Raw Markdown:</h3>
          <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
            <code>{sampleMarkdownContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default MarkdownDemo;
