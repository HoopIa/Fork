//
//  Ingredient.swift
//  Fork
//
//  Each ingredient included in a recipe. This also has functionality to convert 
//  between strandard and metric. Unfortunately given the irregular nature of the
//  standard system, the most "clean" way of conversion is a lot of switch-cases.
//  It's not pretty, but neither is the standard system. Blame America or something.
//
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import Foundation

enum scheme{
    case standard
    case metric
}

//Metric Units
enum mUnit{
    case none
    case mL
    case L
    case whole
    case g
    case kg
    
}

//Standard Units
enum sUnit{
    case none
    case tablespoon
    case teaspoon
    case cup
    case pint
    case gallon
    case whole
    case ounce //Dry Ounce not Fluid Ounce
    case pound
}

//Allergens
enum allergen{
    case milk
    case eggs
    case peanuts
    case treenuts
    case soy
    case gluten
    case fish
    case shellfish
}


class Ingredient{
    var name: String = ""
    var metricAmount: Double = 0
    var metricUnit: mUnit = mUnit.none
    var standardAmount: Double = 0
    var standardUnit: sUnit = sUnit.none
    var currentScheme: scheme
    var allergens: [allergen] = []
    
    init(mAmount: Double, mUnits: mUnit, name: String, allergens: [allergen]){
        metricAmount = mAmount
        metricUnit = mUnits
        currentScheme = .metric
        convertUnits()
    }
    
    init(sAmount: Double, sUnits: sUnit, name: String, allergens: [allergen]){
        standardAmount = sAmount
        standardUnit = sUnits
        currentScheme = .standard
        convertUnits()
    }
    
    func convertUnits(){
        switch self.currentScheme{
        case .standard:
            switch standardUnit{
            case .teaspoon: // teaspoons ---> milliliters
                metricAmount = standardAmount * 4.9289166908532360267
                metricUnit = .mL
                break
            case .tablespoon: // tablespoons ---> milliliters
                metricAmount = standardAmount * 14.786754853806497678
                metricUnit = .mL
                break
            case .cup: // cups ---> milliliters
                metricAmount = standardAmount * 236.58807766090396285
                metricUnit = .mL
                break
            case .pint: // pints ---> liters
                metricAmount = standardAmount * 0.47317615532180790083
                metricUnit = .L
                break
            case .gallon: // gallons ---> liters
                metricAmount = standardAmount * 3.7854092425744632067
                metricUnit = .L
                break
            case .ounce: // dry ounces ---> grams
                metricAmount = standardAmount * 28.349500000010491
                metricUnit = .g
                break
            case .pound: // pounds ---> kilograms
                metricAmount = standardAmount * 0.453592
                metricUnit = .kg
                break
            default:
                break
            }
            self.currentScheme = .metric
        case .metric:
            switch metricUnit{
            case .mL: // milliliters ---> cups
                standardAmount = metricAmount * 0.0042267500000001054228
                standardUnit = .cup
                break
            case .L: // liters ---> pints
                standardAmount = metricAmount * 2.11337500000005285
                standardUnit = .pint
                break
            case .g: // grams ---> ounces
                standardAmount = metricAmount * 0.035274
                standardUnit = .ounce
                break
            case .kg: // kilograms ---> pounds
                standardAmount = metricAmount * 2.20462
                standardUnit = .pound
                break
            default:
                break
            }
            self.currentScheme = .standard
        }
    }
}


