
export interface AppraisalRequest {
  files: File[];
  condition: string;
  collectionId?: string;
}

export interface Reference {
  title: string;
  url: string;
}

export interface AppraisalResult {
  id: string;
  image: string; // Primary/result image (backward compatible)
  images?: string[]; // All images (uploads + result)
  itemName: string;
  author?: string;
  era: string;
  category: string;
  description: string;
  priceRange: {
    low: number;
    high: number;
  };
  currency: string;
  reasoning: string;
  references?: Reference[];
  timestamp: number;
  isPublic?: boolean; // Whether this treasure is publicly shareable
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export type CollectionVisibility = 'private' | 'unlisted' | 'public';
export type ValidationStatus = 'valid' | 'warning' | 'mismatch' | 'duplicate';

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  expectedCount?: number;
  expectedItems?: string[];
  visibility: CollectionVisibility;
  shareToken?: string;
  goalDate?: string;
  createdAt: number;
  updatedAt: number;
  // Computed fields (populated by service)
  itemCount?: number;
  totalValueLow?: number;
  totalValueHigh?: number;
  items?: AppraisalResult[];
}

export interface CollectionItem extends AppraisalResult {
  collectionId?: string;
  seriesIdentifier?: string;
  validationStatus?: ValidationStatus;
  validationNotes?: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description?: string;
  category?: string;
  itemCount: number;
  expectedCount?: number;
  completionPercentage: number;
  totalValueLow: number;
  totalValueHigh: number;
  visibility: CollectionVisibility;
  goalDate?: string;
  thumbnailUrl?: string;
}
