import React from 'react';

/**
 * Format AI responses - convert markdown to proper HTML with clickable links
 * Removes ** artifacts and creates proper bold/heading tags
 */
export function formatAIResponse(text) {
  if (!text) return text;

  let formatted = text;

  // Convert URLs to clickable links (BEFORE other formatting)
  // Match URLs in various formats
  formatted = formatted.replace(
    /(\[([^\]]+)\]\()(https?:\/\/[^\s\)]+)(\))/g,
    '<a href="$3" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$2</a>'
  );
  
  // Match standalone URLs and URLs in parentheses
  formatted = formatted.replace(
    /(\(|\s|^)(https?:\/\/[^\s\)<>]+)(\)|,|\.|;|\s|$)/g,
    (match, before, url, after) => {
      return `${before}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">🔗 Link</a>${after}`;
    }
  );

  // Convert **text** to <strong>text</strong>
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert ### heading to <h3>
  formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');

  // Convert ## heading to <h2>
  formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');

  // Convert # heading to <h1>
  formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // Convert bullet points
  formatted = formatted.replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>');
  formatted = formatted.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');

  // Wrap lists
  formatted = formatted.replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>');

  // Convert line breaks
  formatted = formatted.replace(/\n\n/g, '<br/><br/>');

  return formatted;
}

/**
 * React component wrapper for formatted text
 */
export function FormattedAIText({ children, className = '' }) {
  const formatted = formatAIResponse(children);
  
  return (
    <div 
      className={`formatted-ai-content ${className}`}
      dangerouslySetInnerHTML={{ __html: formatted }}
    />
  );
}