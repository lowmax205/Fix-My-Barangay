// Category types and validation for civic issue reporting

export type CategoryType = 'Infrastructure' | 'Sanitation' | 'Safety' | 'Water' | 'Electrical';

export interface CategoryInfo {
  name: CategoryType;
  description: string;
  icon: string;
  examples: string[];
}

// Category definitions with metadata
export const CATEGORIES: Record<CategoryType, CategoryInfo> = {
  Infrastructure: {
    name: 'Infrastructure',
    description: 'Roads, bridges, streetlights, and public structures',
    icon: '🏗️',
    examples: [
      'Broken streetlight',
      'Pothole in road',
      'Damaged sidewalk',
      'Bridge maintenance needed',
      'Traffic sign missing'
    ]
  },
  Sanitation: {
    name: 'Sanitation',
    description: 'Garbage collection, cleaning, and waste management',
    icon: '🗑️',
    examples: [
      'Overflowing garbage bin',
      'Illegal dumping',
      'Missed garbage collection',
      'Dirty public restroom',
      'Littering problem'
    ]
  },
  Safety: {
    name: 'Safety',
    description: 'Crime, accidents, hazards, and security concerns',
    icon: '🚨',
    examples: [
      'Unsafe intersection',
      'Broken fence',
      'Suspicious activity',
      'Accident-prone area',
      'Poor lighting at night'
    ]
  },
  Water: {
    name: 'Water',
    description: 'Water supply issues, leaks, and flooding',
    icon: '💧',
    examples: [
      'Water pipe leak',
      'No water supply',
      'Flooding in area',
      'Contaminated water',
      'Broken fire hydrant'
    ]
  },
  Electrical: {
    name: 'Electrical',
    description: 'Power outages, damaged electrical infrastructure',
    icon: '⚡',
    examples: [
      'Power outage',
      'Damaged power line',
      'Sparking electrical box',
      'Street light not working',
      'Transformer issues'
    ]
  }
};

// Get all categories as array
export const getAllCategories = (): CategoryInfo[] => {
  return Object.values(CATEGORIES);
};

// Validate if a string is a valid category
export const isValidCategory = (category: string): category is CategoryType => {
  return category in CATEGORIES;
};

// Get category info by name
export const getCategoryInfo = (category: CategoryType): CategoryInfo => {
  return CATEGORIES[category];
};

// Get category names only
export const getCategoryNames = (): CategoryType[] => {
  return Object.keys(CATEGORIES) as CategoryType[];
};

// Validate category and return standardized name
export const validateAndNormalizeCategory = (input: string): CategoryType | null => {
  // Exact match (case sensitive)
  if (isValidCategory(input)) {
    return input;
  }

  // Case insensitive match
  const normalized = input.toLowerCase();
  const found = getCategoryNames().find(cat => cat.toLowerCase() === normalized);
  
  return found || null;
};

// Category validation for API requests
export class CategoryValidator {
  static validate(category: unknown): { isValid: boolean; category?: CategoryType; error?: string } {
    if (typeof category !== 'string') {
      return { isValid: false, error: 'Category must be a string' };
    }

    const normalizedCategory = validateAndNormalizeCategory(category);
    
    if (!normalizedCategory) {
      return { 
        isValid: false, 
        error: `Invalid category. Must be one of: ${getCategoryNames().join(', ')}` 
      };
    }

    return { isValid: true, category: normalizedCategory };
  }

  // Get validation schema for OpenAPI/docs
  static getSchema() {
    return {
      type: 'string',
      enum: getCategoryNames(),
      description: 'Type of civic issue being reported'
    };
  }
}