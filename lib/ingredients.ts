// Ingredient parsing, scaling, and unit conversion utilities

export interface ParsedIngredient {
  original: string
  amount?: number
  unit?: string
  ingredient: string
}

// Common unit conversions (imperial to metric)
const unitConversions: Record<string, { metric: string; factor: number }> = {
  // Volume
  'cup': { metric: 'ml', factor: 236.588 },
  'cups': { metric: 'ml', factor: 236.588 },
  'c': { metric: 'ml', factor: 236.588 },
  'tablespoon': { metric: 'ml', factor: 14.7868 },
  'tablespoons': { metric: 'ml', factor: 14.7868 },
  'tbsp': { metric: 'ml', factor: 14.7868 },
  'tbsp.': { metric: 'ml', factor: 14.7868 },
  'teaspoon': { metric: 'ml', factor: 4.92892 },
  'teaspoons': { metric: 'ml', factor: 4.92892 },
  'tsp': { metric: 'ml', factor: 4.92892 },
  'tsp.': { metric: 'ml', factor: 4.92892 },
  'fluid ounce': { metric: 'ml', factor: 29.5735 },
  'fluid ounces': { metric: 'ml', factor: 29.5735 },
  'fl oz': { metric: 'ml', factor: 29.5735 },
  'pint': { metric: 'ml', factor: 473.176 },
  'pints': { metric: 'ml', factor: 473.176 },
  'quart': { metric: 'ml', factor: 946.353 },
  'quarts': { metric: 'ml', factor: 946.353 },
  'gallon': { metric: 'l', factor: 3.78541 },
  'gallons': { metric: 'l', factor: 3.78541 },
  
  // Weight
  'ounce': { metric: 'g', factor: 28.3495 },
  'ounces': { metric: 'g', factor: 28.3495 },
  'oz': { metric: 'g', factor: 28.3495 },
  'oz.': { metric: 'g', factor: 28.3495 },
  'pound': { metric: 'g', factor: 453.592 },
  'pounds': { metric: 'g', factor: 453.592 },
  'lb': { metric: 'g', factor: 453.592 },
  'lb.': { metric: 'g', factor: 453.592 },
  'lbs': { metric: 'g', factor: 453.592 },
  
  // Length
  'inch': { metric: 'cm', factor: 2.54 },
  'inches': { metric: 'cm', factor: 2.54 },
  'in': { metric: 'cm', factor: 2.54 },
  'in.': { metric: 'cm', factor: 2.54 },
  'foot': { metric: 'cm', factor: 30.48 },
  'feet': { metric: 'cm', factor: 30.48 },
  'ft': { metric: 'cm', factor: 30.48 },
  'ft.': { metric: 'cm', factor: 30.48 },
}

// Metric to imperial conversions
const metricToImperial: Record<string, { imperial: string; factor: number }> = {
  'ml': { imperial: 'cup', factor: 0.00422675 },
  'l': { imperial: 'cup', factor: 4.22675 },
  'g': { imperial: 'oz', factor: 0.035274 },
  'kg': { imperial: 'lb', factor: 2.20462 },
  'cm': { imperial: 'in', factor: 0.393701 },
}

// Parse ingredient string to extract amount, unit, and ingredient name
export function parseIngredient(ingredient: string): ParsedIngredient {
  const original = ingredient.trim()
  
  // Pattern to match: number (possibly fraction) + unit + ingredient
  // Examples: "2 cups flour", "1/2 teaspoon salt", "3/4 cup (63 g) cocoa powder"
  const patterns = [
    // Match: "3/4 cup (63 g) cocoa powder" or "2 cups (240 g) flour"
    /^(\d+\/\d+|\d+\.?\d*)\s+([a-zA-Z.]+)\s+\((\d+(?:\.\d+)?)\s*([a-zA-Z]+)\)\s+(.+)$/,
    // Match: "2 cups flour" or "1/2 teaspoon salt"
    /^(\d+\/\d+|\d+\.?\d*)\s+([a-zA-Z.]+)\s+(.+)$/,
    // Match: "2 cups" (no ingredient name after)
    /^(\d+\/\d+|\d+\.?\d*)\s+([a-zA-Z.]+)$/,
  ]
  
  for (const pattern of patterns) {
    const match = ingredient.match(pattern)
    if (match) {
      const amountStr = match[1]
      const unit = match[2].toLowerCase()
      const amount = parseFraction(amountStr)
      
      // If there's a weight in parentheses, use that as the base
      if (match[3] && match[4]) {
        const weightAmount = parseFloat(match[3])
        const weightUnit = match[4].toLowerCase()
        const ingredientName = match[5] || ''
        
        return {
          original,
          amount: weightAmount,
          unit: weightUnit,
          ingredient: ingredientName,
        }
      }
      
      const ingredientName = match[3] || ''
      
      return {
        original,
        amount,
        unit,
        ingredient: ingredientName,
      }
    }
  }
  
  // If no pattern matches, return as-is
  return {
    original,
    ingredient: original,
  }
}

// Parse fraction string to decimal (e.g., "3/4" -> 0.75, "1 1/2" -> 1.5)
function parseFraction(str: string): number {
  // Handle mixed fractions like "1 1/2"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1])
    const num = parseFloat(mixedMatch[2])
    const den = parseFloat(mixedMatch[3])
    return whole + (num / den)
  }
  
  // Handle simple fractions like "3/4"
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1])
    const den = parseFloat(fractionMatch[2])
    return num / den
  }
  
  // Handle decimal numbers
  return parseFloat(str) || 0
}

// Format number nicely (remove unnecessary decimals)
function formatNumber(num: number): string {
  if (num % 1 === 0) {
    return num.toString()
  }
  
  // Try to convert to fraction for common values
  const fraction = decimalToFraction(num)
  if (fraction) {
    return fraction
  }
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100 + ''
}

// Convert decimal to fraction for common values
function decimalToFraction(num: number): string | null {
  const commonFractions: Record<number, string> = {
    0.125: '1/8',
    0.25: '1/4',
    0.333: '1/3',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.667: '2/3',
    0.75: '3/4',
    0.875: '7/8',
  }
  
  for (const [decimal, fraction] of Object.entries(commonFractions)) {
    if (Math.abs(num - parseFloat(decimal)) < 0.01) {
      return fraction
    }
  }
  
  return null
}

// Scale an ingredient by a factor
export function scaleIngredient(parsed: ParsedIngredient, factor: number): ParsedIngredient {
  if (!parsed.amount) {
    return parsed // Can't scale if no amount
  }
  
  const scaledAmount = parsed.amount * factor
  
  return {
    ...parsed,
    amount: scaledAmount,
  }
}

// Convert ingredient between metric and imperial
export function convertIngredient(
  parsed: ParsedIngredient,
  toMetric: boolean
): ParsedIngredient {
  if (!parsed.unit || !parsed.amount) {
    return parsed // Can't convert if no unit or amount
  }
  
  const unit = parsed.unit.toLowerCase()
  
  if (toMetric) {
    // Convert from imperial to metric
    const conversion = unitConversions[unit]
    if (conversion) {
      const convertedAmount = parsed.amount * conversion.factor
      return {
        ...parsed,
        amount: convertedAmount,
        unit: conversion.metric,
      }
    }
  } else {
    // Convert from metric to imperial
    const conversion = metricToImperial[unit]
    if (conversion) {
      const convertedAmount = parsed.amount * conversion.factor
      return {
        ...parsed,
        amount: convertedAmount,
        unit: conversion.imperial,
      }
    }
  }
  
  // No conversion available, return as-is
  return parsed
}

// Format parsed ingredient back to string
export function formatIngredient(parsed: ParsedIngredient): string {
  if (!parsed.amount || !parsed.unit) {
    return parsed.ingredient || parsed.original
  }
  
  const amountStr = formatNumber(parsed.amount)
  const unit = parsed.unit
  
  // Handle pluralization
  const pluralUnit = parsed.amount !== 1 && unitConversions[unit] 
    ? getPluralUnit(unit)
    : unit
  
  if (parsed.ingredient) {
    return `${amountStr} ${pluralUnit} ${parsed.ingredient}`
  }
  
  return `${amountStr} ${pluralUnit}`
}

// Get plural form of unit
function getPluralUnit(unit: string): string {
  const pluralMap: Record<string, string> = {
    'cup': 'cups',
    'tablespoon': 'tablespoons',
    'teaspoon': 'teaspoons',
    'fluid ounce': 'fluid ounces',
    'pint': 'pints',
    'quart': 'quarts',
    'gallon': 'gallons',
    'ounce': 'ounces',
    'pound': 'pounds',
    'inch': 'inches',
    'foot': 'feet',
  }
  
  return pluralMap[unit] || unit + 's'
}

// Process all ingredients: scale and convert
export function processIngredients(
  ingredients: string[],
  servings: number,
  originalServings: number = 4,
  useMetric: boolean = false
): string[] {
  return ingredients.map(ingredient => {
    const parsed = parseIngredient(ingredient)
    
    // Scale if we have an amount
    let processed = parsed
    if (parsed.amount && originalServings > 0) {
      const scaleFactor = servings / originalServings
      processed = scaleIngredient(parsed, scaleFactor)
    }
    
    // Convert units if needed
    if (processed.unit && useMetric) {
      processed = convertIngredient(processed, true)
    } else if (processed.unit && !useMetric) {
      // Check if it's already metric and convert to imperial
      const unit = processed.unit.toLowerCase()
      if (metricToImperial[unit]) {
        processed = convertIngredient(processed, false)
      }
    }
    
    return formatIngredient(processed)
  })
}

