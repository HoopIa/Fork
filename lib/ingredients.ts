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

// All recognized units for better parsing
const allUnits = [
  // Volume - plural and singular
  'cups?', 'tablespoons?', 'tbsp\\.?', 'teaspoons?', 'tsp\\.?',
  'fluid ounces?', 'fl oz', 'pints?', 'quarts?', 'gallons?',
  'ml', 'milliliters?', 'l', 'liters?', 'litres?',
  // Weight
  'ounces?', 'oz\\.?', 'pounds?', 'lbs?\\.?', 'lb\\.?',
  'g', 'grams?', 'kg', 'kilograms?',
  // Count/misc
  'cloves?', 'heads?', 'bunches?', 'stalks?', 'slices?',
  'pieces?', 'cans?', 'packages?', 'bags?', 'jars?', 'bottles?',
  'sticks?', 'pinch(?:es)?', 'dash(?:es)?', 'sprigs?',
  // Length
  'inch(?:es)?', 'in\\.?', 'feet', 'foot', 'ft\\.?', 'cm', 'centimeters?',
]

// Parse ingredient string to extract amount, unit, and ingredient name
export function parseIngredient(ingredient: string): ParsedIngredient {
  const original = ingredient.trim()
  
  // Build a regex pattern that matches any unit
  const unitPattern = allUnits.join('|')
  
  // Patterns to try in order (most specific first)
  const patterns: { regex: RegExp; groups: string[] }[] = [
    // Match: "3/4 cup (63 g) cocoa powder" - with weight in parentheses
    {
      regex: new RegExp(`^([\\d\\s/\\.]+)\\s+(${unitPattern})\\s+\\((\\d+(?:\\.\\d+)?)\\s*(${unitPattern})\\)\\s+(?:of\\s+)?(.+)$`, 'i'),
      groups: ['amount', 'unit', 'weightAmount', 'weightUnit', 'ingredient']
    },
    // Match: "2 lbs of bananas" - with "of" between unit and ingredient
    {
      regex: new RegExp(`^([\\d\\s/\\.]+)\\s+(${unitPattern})\\s+of\\s+(.+)$`, 'i'),
      groups: ['amount', 'unit', 'ingredient']
    },
    // Match: "2 cups flour" or "1 1/2 teaspoons salt" - standard format
    {
      regex: new RegExp(`^([\\d\\s/\\.]+)\\s+(${unitPattern})\\s+(.+)$`, 'i'),
      groups: ['amount', 'unit', 'ingredient']
    },
    // Match: "2 cups" (no ingredient name after)
    {
      regex: new RegExp(`^([\\d\\s/\\.]+)\\s+(${unitPattern})$`, 'i'),
      groups: ['amount', 'unit']
    },
    // Match: "3 eggs" or "2 bananas" - count without unit
    {
      regex: /^([\d\s/\.]+)\s+(.+)$/,
      groups: ['amount', 'ingredient']
    },
  ]
  
  for (const { regex, groups } of patterns) {
    const match = ingredient.match(regex)
    if (match) {
      const result: ParsedIngredient = {
        original,
        ingredient: '',
      }
      
      // Map captured groups to result fields
      groups.forEach((group, index) => {
        const value = match[index + 1]
        if (!value) return
        
        switch (group) {
          case 'amount':
            result.amount = parseFraction(value.trim())
            break
          case 'unit':
            result.unit = normalizeUnit(value.trim())
            break
          case 'weightAmount':
            // Override with weight if present
            result.amount = parseFloat(value)
            break
          case 'weightUnit':
            result.unit = normalizeUnit(value)
            break
          case 'ingredient':
            result.ingredient = value.trim()
            break
        }
      })
      
      // Make sure we have at least something
      if (result.amount !== undefined || result.ingredient) {
        return result
      }
    }
  }
  
  // If no pattern matches, return as-is
  return {
    original,
    ingredient: original,
  }
}

// Normalize unit to standard form
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().replace(/\.$/, '')
  
  const unitMap: Record<string, string> = {
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'ounce': 'oz',
    'ounces': 'oz',
    'pound': 'lb',
    'pounds': 'lb',
    'lbs': 'lb',
    'cup': 'cup',
    'cups': 'cup',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'liter': 'l',
    'liters': 'l',
    'litre': 'l',
    'litres': 'l',
  }
  
  return unitMap[normalized] || normalized
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
  // If we have an amount but no unit (e.g., "3 eggs")
  if (parsed.amount !== undefined && !parsed.unit) {
    const amountStr = formatNumber(parsed.amount)
    if (parsed.ingredient) {
      return `${amountStr} ${parsed.ingredient}`
    }
    return parsed.original
  }
  
  // If we have amount and unit
  if (parsed.amount !== undefined && parsed.unit) {
    const amountStr = formatNumber(parsed.amount)
    
    // Get display unit (pluralized if needed)
    const displayUnit = getDisplayUnit(parsed.unit, parsed.amount)
    
    if (parsed.ingredient) {
      return `${amountStr} ${displayUnit} ${parsed.ingredient}`
    }
    return `${amountStr} ${displayUnit}`
  }
  
  // Fallback to original
  return parsed.ingredient || parsed.original
}

// Get display form of unit with proper pluralization
function getDisplayUnit(unit: string, amount: number): string {
  const singularToPlural: Record<string, string> = {
    'cup': 'cups',
    'tbsp': 'tbsp',
    'tsp': 'tsp',
    'oz': 'oz',
    'lb': 'lbs',
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'clove': 'cloves',
    'head': 'heads',
    'bunch': 'bunches',
    'stalk': 'stalks',
    'slice': 'slices',
    'piece': 'pieces',
    'can': 'cans',
    'package': 'packages',
    'stick': 'sticks',
    'pinch': 'pinches',
    'dash': 'dashes',
    'sprig': 'sprigs',
    'inch': 'inches',
    'cm': 'cm',
  }
  
  // Use plural if amount > 1
  if (amount > 1 && singularToPlural[unit]) {
    return singularToPlural[unit]
  }
  
  return unit
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

