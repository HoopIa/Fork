//
//  Recipe.swift
//  Fork
//
//  Created by Jacob Williamson on 1/10/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import Foundation
import UIKit

class Recipe{
    // Core Recipe
    var name: String = ""
    var coverImage: UIImage = UIImage()
    var prepTime: Int = 0 // Time measured in minutes
    var cookTime: Int = 0
    var readyTime: Int = 0
    var ingredients: [Ingredient] = []
    var tasks: [Task] = []
    var tools: [Tool] = []
    
    // Social Aspects
    var forks: Int = 0
    var isSecret: Bool = false
    
    // Meta Data
    var score: Double = 100.0
    var improvNotes: String = ""
    var date: Date = Date()
}
