//
//  Measurement.swift
//  Fork
//
//  Created by Jacob Williamson on 1/10/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import Foundation

enum scheme {
    case standard
    case metric
}

enum unit {
    case none
    case mL
    case L
    case tbsp
    case tsp
    case cup
    case pint
    case gallon
    case whole
    case g
    case kg
    case oz
}

class Measurement {
    var amount: Double = 0
    var currentScheme: scheme = scheme.standard
    var currentUnit: unit = unit.none
    
    //Converts amounts from Metric to Standard or vice versa
    func convertUnits(){
        switch self.currentScheme{
        case .standard:
            switch self.currentUnit{
            case .tbsp:
                self.amount *= 14.7868
                break
            case .tsp:
                break
            case .cup:
                break
            case .pint:
                break
            case .gallon:
                break
            case .oz:
                break
            default:
                break
            }
        case .metric:
            switch self.currentUnit{
                case .tbsp:
                break
                case .tsp:
                break
                case .cup:
                break
                case .pint:
                break
                case .gallon:
                break
                case .oz:
                break
                default:
                break
            }
        }
    }
}



