/**
 * Markdown to React text formatter
 *
 * Converts simple markdown patterns to React elements:
 * - **bold** → <strong>bold</strong>
 * - Numbered lists (1. 2. 3.) → proper formatting
 */

import React from 'react';

type FormattedSegment = {
  type: 'text' | 'bold';
  content: string;
};

/**
 * Parse text into segments of plain text and bold text
 */
function parseSegments(text: string): FormattedSegment[] {
  const segments: FormattedSegment[] = [];
  const boldPattern = /\*\*([^*]+)\*\*/g;

  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the bold segment
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the bold segment
    segments.push({
      type: 'bold',
      content: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last bold segment
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Convert segments to React elements
 */
function segmentsToReact(segments: FormattedSegment[]): React.ReactNode[] {
  return segments.map((segment, index) => {
    if (segment.type === 'bold') {
      return React.createElement('strong', { key: index }, segment.content);
    }
    return segment.content;
  });
}

/**
 * Format a single line of text with markdown
 */
function formatLine(line: string, key: number): React.ReactNode {
  const segments = parseSegments(line);
  const content = segmentsToReact(segments);

  // Check if it's a numbered list item
  const listMatch = line.match(/^(\d+)\.\s+(.*)$/);
  if (listMatch) {
    const segments = parseSegments(listMatch[2]);
    const itemContent = segmentsToReact(segments);
    return React.createElement(
      'div',
      { key, className: 'flex gap-2 mb-1' },
      React.createElement('span', { className: 'text-slate-500 shrink-0' }, `${listMatch[1]}.`),
      React.createElement('span', null, itemContent)
    );
  }

  return React.createElement('span', { key }, content);
}

/**
 * Format markdown text to React elements
 *
 * Supports:
 * - **bold** text
 * - Numbered lists (1. Item)
 * - Paragraph breaks (double newline)
 *
 * @param text - The markdown text to format
 * @returns React elements with proper formatting
 */
export function formatMarkdownText(text: string): React.ReactNode {
  if (!text) return null;

  // Split by paragraphs (double newline) or single newlines
  const lines = text.split(/\n/);

  if (lines.length === 1) {
    // Single line - just format inline
    const segments = parseSegments(text);
    return React.createElement(React.Fragment, null, segmentsToReact(segments));
  }

  // Multiple lines - format each line
  const elements: React.ReactNode[] = [];
  let inList = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      // Empty line - add paragraph break if not in a list
      if (!inList && elements.length > 0) {
        elements.push(React.createElement('div', { key: `br-${index}`, className: 'h-3' }));
      }
      inList = false;
      return;
    }

    const isListItem = /^\d+\.\s+/.test(trimmedLine);
    if (isListItem) {
      inList = true;
    } else {
      inList = false;
    }

    elements.push(formatLine(trimmedLine, index));

    // Add line break for non-list items (unless next line is empty)
    if (!isListItem && index < lines.length - 1 && lines[index + 1].trim()) {
      elements.push(React.createElement('br', { key: `lbr-${index}` }));
    }
  });

  return React.createElement(React.Fragment, null, elements);
}

/**
 * Strip markdown formatting and return plain text
 * Useful for preview/truncation calculations
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
    .replace(/^\d+\.\s+/gm, '')          // Remove list numbers
    .replace(/\n+/g, ' ')                // Collapse newlines
    .replace(/\s+/g, ' ')                // Collapse whitespace
    .trim();
}

/**
 * Truncate text to approximately N characters, breaking at word boundaries
 */
export function truncateText(text: string, maxLength: number): { truncated: string; isTruncated: boolean } {
  const plainText = stripMarkdown(text);

  if (plainText.length <= maxLength) {
    return { truncated: text, isTruncated: false };
  }

  // Find a good break point
  let breakPoint = maxLength;
  while (breakPoint > 0 && plainText[breakPoint] !== ' ') {
    breakPoint--;
  }

  if (breakPoint === 0) {
    breakPoint = maxLength;
  }

  // Now map back to original text with markdown
  // This is approximate - we'll find the position in original that corresponds
  let originalPos = 0;
  let plainPos = 0;

  while (plainPos < breakPoint && originalPos < text.length) {
    // Skip markdown markers
    if (text.slice(originalPos, originalPos + 2) === '**') {
      originalPos += 2;
      continue;
    }
    if (text[originalPos] === '\n') {
      originalPos++;
      plainPos++;
      continue;
    }
    originalPos++;
    plainPos++;
  }

  // Clean up any incomplete markdown
  let truncated = text.slice(0, originalPos);

  // If we cut in the middle of a bold marker, remove it
  const openBolds = (truncated.match(/\*\*/g) || []).length;
  if (openBolds % 2 !== 0) {
    // Remove the last incomplete bold marker
    truncated = truncated.replace(/\*\*[^*]*$/, '');
  }

  return { truncated: truncated.trim(), isTruncated: true };
}
