//
//  RecipeViewController.swift
//  Fork
//
//  Created by Jacob Williamson on 1/11/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import UIKit
import ParallaxHeader

class RecipeViewController: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    @IBOutlet weak var table: UITableView!
    let screenSize = UIScreen.main.bounds
    let screenWidth = UIScreen.main.bounds.width
    let screenHeight = UIScreen.main.bounds.height
    
    override func viewDidLoad() {
        super.viewDidLoad()
        table.dataSource = self
        table.delegate = self
        
        let imageView = UIImageView()
        imageView.image = UIImage(named: "CakeImage")
        imageView.contentMode = .scaleAspectFill
        
        table.parallaxHeader.view = imageView
        table.parallaxHeader.height = 400
        table.parallaxHeader.minimumHeight = 0
        table.parallaxHeader.mode = .topFill
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return 8
    }
    
    func tableView(_ tableView: UITableView, numberOfSectionsInTableView section: Int) -> Int {
        return 1
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        switch indexPath.row {
        case 0:
            return UITableViewAutomaticDimension
        case 1:
            return screenHeight / 6
        case 2:
            return screenHeight / 6
        case 3:
            return screenHeight / 20
        case 3:
            return screenHeight / 10
        default: ()
            return screenHeight / 10
        }
    }
    
    func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
        switch indexPath.row {
        case 0:
            return 200
        default: ()
            return 50
        }
    }
    
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        switch indexPath.row {
        case 0:
            let cell:TitleCell = tableView.dequeueReusableCell(withIdentifier: "titleCell", for: indexPath) as! TitleCell
            return cell
        case 1:
            let cell:PreparationCell = tableView.dequeueReusableCell(withIdentifier: "preparationCell", for: indexPath) as! PreparationCell
            return cell
        case 2:
            let cell:IngredientCell = tableView.dequeueReusableCell(withIdentifier: "ingredientCell", for: indexPath) as! IngredientCell
            return cell
        case 3:
            let cell:DirectionCell = tableView.dequeueReusableCell(withIdentifier: "directionCell", for: indexPath) as! DirectionCell
            return cell
        default:
            let cell:DirectionCell = tableView.dequeueReusableCell(withIdentifier: "directionCell", for: indexPath) as! DirectionCell
            return cell
        }
    }
    

    
}


