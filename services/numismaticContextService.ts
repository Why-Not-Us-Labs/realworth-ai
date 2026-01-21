/**
 * Numismatic Context Service
 * Provides specialized reference data for coin and currency appraisals
 */

import fs from 'fs';
import path from 'path';

export type NumismaticCategory = 'coin' | 'currency' | null;

type HighValueUrgency = 'high' | 'medium' | 'low';

export type HighValueAlert = {
  isHighValue: boolean;
  triggers: string[];
  urgency: HighValueUrgency;
};

type ContextOptions = {
  includeErrors?: boolean;
  includeGrading?: boolean;
};

const CONTEXT_BASE_PATH = path.join(process.cwd(), 'lib', 'context', 'numismatics');

// Cache for loaded context files
const contextCache: Map<string, string> = new Map();

/**
 * Load a context file from disk (with caching)
 */
async function loadContextFile(filename: string): Promise<string> {
  if (contextCache.has(filename)) {
    return contextCache.get(filename)!;
  }

  const filePath = path.join(CONTEXT_BASE_PATH, filename);
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    contextCache.set(filename, content);
    return content;
  } catch (error) {
    console.warn(`[NumismaticContext] File not found: ${filename}`);
    return '';
  }
}

/**
 * Detect if item is a coin or currency based on description/category
 */
export function detectNumismaticCategory(
  description: string,
  category?: string
): NumismaticCategory {
  const text = `${description} ${category || ''}`.toLowerCase();

  const coinKeywords = [
    'coin', 'penny', 'cent', 'nickel', 'dime', 'quarter', 'half dollar',
    'dollar coin', 'morgan', 'peace dollar', 'eagle', 'sovereign', 'peso',
    'buffalo', 'mercury', 'walking liberty', 'seated liberty', 'barber',
    'indian head', 'wheat', 'lincoln', 'jefferson', 'washington'
  ];

  const currencyKeywords = [
    'bill', 'note', 'currency', 'paper money', 'certificate',
    'banknote', 'federal reserve', 'silver certificate', 'gold certificate',
    'legal tender', 'treasury note', 'national bank'
  ];

  // Check for explicit category match first
  if (category?.toLowerCase() === 'coin') return 'coin';
  if (category?.toLowerCase() === 'currency' || category?.toLowerCase() === 'paper money') return 'currency';

  // Then check keywords
  if (coinKeywords.some(kw => text.includes(kw))) return 'coin';
  if (currencyKeywords.some(kw => text.includes(kw))) return 'currency';

  return null;
}

/**
 * Check if item triggers high-value alerts based on quick scan criteria
 */
export function checkHighValueTriggers(itemData: {
  year?: number;
  mintMark?: string;
  denomination?: string;
  metalColor?: string;
  sealColor?: string;
  serialNumber?: string;
  description?: string;
}): HighValueAlert {
  const triggers: string[] = [];
  const desc = (itemData.description || '').toLowerCase();

  // Coin triggers
  if (itemData.mintMark?.toUpperCase() === 'CC') {
    triggers.push('Carson City mint mark (CC) - always valuable');
  }

  if (itemData.year && itemData.year < 1800) {
    triggers.push('Pre-1800 date - potentially very rare');
  }

  if (itemData.year === 1893 && itemData.mintMark?.toUpperCase() === 'S' && desc.includes('morgan')) {
    triggers.push('1893-S Morgan Dollar - key date ($3,500 - $2,000,000)');
  }

  if (itemData.year === 1909 && itemData.mintMark?.toUpperCase() === 'S' && desc.includes('vdb')) {
    triggers.push('1909-S VDB Lincoln Cent - key date ($700 - $10,000)');
  }

  if (itemData.year === 1943 && (desc.includes('copper') || itemData.metalColor?.toLowerCase().includes('copper'))) {
    triggers.push('Possible 1943 Copper Cent - EXTREMELY RARE ($100,000 - $1,700,000)');
  }

  if (itemData.metalColor?.toLowerCase().includes('gold') || desc.includes('gold coin')) {
    triggers.push('Gold coin detected - always valuable');
  }

  // Currency triggers
  if (itemData.sealColor?.toLowerCase() === 'gold' || desc.includes('gold certificate')) {
    triggers.push('Gold Certificate - valuable collectible');
  }

  if (itemData.sealColor?.toLowerCase() === 'red' || desc.includes('red seal')) {
    triggers.push('Red Seal note - collectible');
  }

  const denomMatch = itemData.denomination?.match(/\$?(\d+)/);
  if (denomMatch) {
    const denom = parseInt(denomMatch[1], 10);
    if (denom >= 500) {
      triggers.push(`High denomination ($${denom}) - valuable`);
    }
  }

  if (desc.includes('large size') || desc.includes('large bill')) {
    triggers.push('Large size note (pre-1929) - collectible');
  }

  // Serial number patterns
  if (itemData.serialNumber) {
    const serial = itemData.serialNumber.replace(/\D/g, '');
    if (/^(\d)\1{7}$/.test(serial)) {
      triggers.push('Solid serial number - premium');
    }
    if (serial === '12345678' || serial === '87654321') {
      triggers.push('Ladder serial number - premium');
    }
    if (parseInt(serial, 10) <= 100 && serial.length >= 8) {
      triggers.push('Low serial number - premium');
    }
    if (itemData.serialNumber.includes('*') || itemData.serialNumber.includes('★')) {
      triggers.push('Star note - replacement note premium');
    }
  }

  // Error detection
  if (desc.includes('double die') || desc.includes('doubled die') || desc.includes('ddo')) {
    triggers.push('Possible doubled die error - verify');
  }
  if (desc.includes('off center') || desc.includes('off-center')) {
    triggers.push('Off-center strike error');
  }

  const isHighValue = triggers.length > 0;
  const urgency: HighValueUrgency = triggers.length >= 3 ? 'high' : triggers.length >= 1 ? 'medium' : 'low';

  return { isHighValue, triggers, urgency };
}

/**
 * Load numismatic context for AI appraisal prompt
 */
export async function loadNumismaticContext(
  category: NumismaticCategory,
  options: ContextOptions = {}
): Promise<string> {
  if (!category) return '';

  const contextParts: string[] = [];

  // Always load quick scan for high-value triggers
  const quickScan = await loadContextFile('QUICK_SCAN.md');
  if (quickScan) contextParts.push(quickScan);

  // Load category-specific context
  if (category === 'coin') {
    const coinContext = await loadContextFile('coins_usa.md');
    if (coinContext) contextParts.push(coinContext);
  } else if (category === 'currency') {
    const currencyContext = await loadContextFile('paper_usa.md');
    if (currencyContext) contextParts.push(currencyContext);
  }

  // Optionally load error reference
  if (options.includeErrors) {
    const errorContext = await loadContextFile('errors_varieties.md');
    if (errorContext) contextParts.push(errorContext);
  }

  // Optionally load grading reference
  if (options.includeGrading) {
    const gradingFile = category === 'coin' ? 'grading_coins.md' : 'grading_currency.md';
    const gradingContext = await loadContextFile(gradingFile);
    if (gradingContext) contextParts.push(gradingContext);
  }

  return contextParts.join('\n\n---\n\n');
}

/**
 * Format numismatic context for injection into AI prompt
 * Main entry point - follows metalPriceService pattern
 */
export async function formatNumismaticContextForPrompt(
  category: NumismaticCategory,
  highValueAlert?: HighValueAlert
): Promise<string> {
  if (!category) return '';

  // Load context with grading and errors if high-value item detected
  const includeExtras = highValueAlert?.isHighValue || false;
  const context = await loadNumismaticContext(category, {
    includeErrors: includeExtras,
    includeGrading: true,
  });

  if (!context) return '';

  let prompt = `

## NUMISMATIC REFERENCE DATA
Use the following expert reference data to inform your ${category} appraisal:

${context}
`;

  // Add high-value alert if present
  if (highValueAlert?.isHighValue) {
    prompt += `

## HIGH-VALUE ALERT
This item has triggered the following high-value indicators:
${highValueAlert.triggers.map(t => `- ${t}`).join('\n')}

Pay special attention to authentication and condition assessment. If genuine, this item could be significantly valuable. Recommend professional authentication if applicable.
`;
  }

  return prompt;
}

/**
 * Clear the context cache (useful for development/testing)
 */
export function clearContextCache(): void {
  contextCache.clear();
}

export const numismaticContextService = {
  detectNumismaticCategory,
  checkHighValueTriggers,
  loadNumismaticContext,
  formatNumismaticContextForPrompt,
  clearContextCache,
};
