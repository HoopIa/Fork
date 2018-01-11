//
//  User.swift
//  Fork
//
//  Basic user class to keep track of repos, followers, settings and preferences
//
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import Foundation
import UIKit

class User {
    var userID: Int = 0
    var profilePic: UIImage = UIImage()
    var repo: [Repo] = []
    var isPrivate: Bool = false
    var followerCount: Int = 0
    var forkCount: Int = 0
    
    var followers: [Int] = [] //Array of userIDs 
    var following: [Int] = [] //Array of userIDs 
}
