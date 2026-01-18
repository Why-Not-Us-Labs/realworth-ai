'use client';

import { useState, useRef, useEffect } from 'react';
import { formatMarkdownText, stripMarkdown } from '@/lib/formatText';

type CollapsibleTextProps = {
  text: string;
  previewLength?: number;  // Characters to show in preview (default: 150)
  className?: string;
  expandedClassName?: string;
};

/**
 * Collapsible text component with "Read more" / "Show less" toggle
 *
 * Features:
 * - Truncates long text with "..." and "Read more" link
 * - Smooth height animation on expand/collapse
 * - Formats **bold** markdown
 * - Respects word boundaries for truncation
 */
export function CollapsibleText({
  text,
  previewLength = 150,
  className = '',
  expandedClassName = '',
}: CollapsibleTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldTruncate, setShouldTruncate] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if text needs truncation
  useEffect(() => {
    const plainText = stripMarkdown(text);
    setShouldTruncate(plainText.length > previewLength);
  }, [text, previewLength]);

  if (!text) return null;

  // Get truncated preview
  const getPreviewText = (): string => {
    const plainText = stripMarkdown(text);
    if (plainText.length <= previewLength) {
      return text;
    }

    // Find word boundary for clean truncation
    let breakPoint = previewLength;
    while (breakPoint > 0 && plainText[breakPoint] !== ' ') {
      breakPoint--;
    }
    if (breakPoint === 0) breakPoint = previewLength;

    // Map back to original text position (approximate)
    let originalPos = 0;
    let plainPos = 0;

    while (plainPos < breakPoint && originalPos < text.length) {
      if (text.slice(originalPos, originalPos + 2) === '**') {
        originalPos += 2;
        continue;
      }
      originalPos++;
      plainPos++;
    }

    let preview = text.slice(0, originalPos);

    // Clean incomplete markdown
    const openBolds = (preview.match(/\*\*/g) || []).length;
    if (openBolds % 2 !== 0) {
      preview = preview.replace(/\*\*[^*]*$/, '');
    }

    return preview.trim();
  };

  const previewText = getPreviewText();

  return (
    <div className={className}>
      <div
        ref={contentRef}
        className={`transition-all duration-300 ease-in-out ${isExpanded ? expandedClassName : ''}`}
      >
        {isExpanded ? (
          formatMarkdownText(text)
        ) : (
          <>
            {formatMarkdownText(previewText)}
            {shouldTruncate && <span className="text-slate-400">...</span>}
          </>
        )}
      </div>

      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-teal-600 hover:text-teal-700 text-sm font-medium mt-1 inline-block focus:outline-none focus:underline"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default CollapsibleText;
