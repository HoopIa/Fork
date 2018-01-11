//
//  Repo.swift
//  Fork
//
//  Repo class that keeps version history of recipes. Each Repo is an evolution 
//  of a single recipe. Each recipe in this array is a single iteration of the 
//  original, and as changes are made, a new recipe is appended to the repo. The 
//
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import Foundation

class Repo {
    var recipeVersions: [Recipe] = []
}
