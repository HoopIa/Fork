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
    
    @IBOutlet weak var verticalHeaderConstraint: NSLayoutConstraint!
    @IBOutlet weak var table: UITableView!
    
    var recipe: Recipe = Recipe()
    
    let screenSize = UIScreen.main.bounds
    let screenWidth = UIScreen.main.bounds.width
    let screenHeight = UIScreen.main.bounds.height
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        table.dataSource = self
        table.delegate = self
        recipe = ChocolateEspressoInitializer()
        
        //Parallax Scrolling Code
        let imageView = UIImageView()
        imageView.image = recipe.coverImage
        imageView.contentMode = .scaleAspectFill
        
        table.parallaxHeader.view = imageView
        table.parallaxHeader.height = screenHeight/3
        table.parallaxHeader.minimumHeight = 0
        table.parallaxHeader.mode = .topFill

        //UI Elements Specific to different iPhones
        if UIDevice().userInterfaceIdiom == .phone {
            switch UIScreen.main.nativeBounds.height {
            case 1136:
                print("iPhone 5 or 5S or 5C")
            case 1334:
                print("iPhone 6/6S/7/8")
            case 2208:
                print("iPhone 6+/6S+/7+/8+")
            case 2436:
                verticalHeaderConstraint.constant = -55
                print("iPhone X")
            default:
                print("unknown")
            }
        }
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    /* Tableview Functions */
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return recipe.ingredients.count + recipe.tasks.count + 4
    }
    
    func tableView(_ tableView: UITableView, numberOfSectionsInTableView section: Int) -> Int {
        return 1
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return UITableViewAutomaticDimension;
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
            cell.recipeTitle.text = "\(recipe.name)"
            if recipe.forks > 1000 {
                cell.recipeForkCount.titleLabel?.text = "\(Int((recipe.forks)/1000))k Forks"
                cell.recipeForkCount.setTitle("\(Int((recipe.forks)/1000))k Forks", for: .normal)
            }
            else{
                cell.recipeForkCount.setTitle("\(recipe.forks) Forks", for: .normal)
            }
            cell.recipeAuthor.setTitle("By \(recipe.author)", for: .normal)
            return cell
        case 1:
            let cell:PreparationCell = tableView.dequeueReusableCell(withIdentifier: "preparationCell", for: indexPath) as! PreparationCell
            cell.prepTime.text = "\(recipe.prepTime) minutes"
            cell.cookTime.text = "\(recipe.cookTime) minutes"
            cell.totalTime.text = "\(recipe.readyTime) minutes"
            cell.servingNumber.text = "\(recipe.servings)"
            cell.stepper.addTarget(self, action: #selector(self.didChangeServings(sender:)), for: .valueChanged)
            cell.stepper.value = Double(recipe.servings)
            return cell
        case 2:
            let cell:IngredientsHeaderCell = tableView.dequeueReusableCell(withIdentifier: "ingredientsHeaderCell", for: indexPath) as! IngredientsHeaderCell
            return cell
        case 3..<(3 + recipe.ingredients.count):
            let cell:IngredientCell = tableView.dequeueReusableCell(withIdentifier: "ingredientCell", for: indexPath) as! IngredientCell
            let ingredient = recipe.ingredients[indexPath.row - 3]
            
            print("Ingredient Name = \(ingredient.name)")
            cell.ingredient.text = ingredient.name
            if(ingredient.standardAmount != 1.0 && String(describing: ingredient.standardUnit) != "whole"){
                cell.amount.text = String(format: "%.2g", ingredient.standardAmount) + " " + String(describing: ingredient.standardUnit) + "s"
                print(cell.amount.text)
            }
            else{
                cell.amount.text = String(format: "%.2g", ingredient.standardAmount) + " " + String(describing: ingredient.standardUnit)
            }
            return cell
        case (3 + recipe.ingredients.count):
            let cell:DirectionsHeaderCell = tableView.dequeueReusableCell(withIdentifier: "directionsHeaderCell", for: indexPath) as! DirectionsHeaderCell
            return cell
        case (4 + recipe.ingredients.count)..<(4 + recipe.ingredients.count + recipe.tasks.count):
            let cell:DirectionCell = tableView.dequeueReusableCell(withIdentifier: "directionCell", for: indexPath) as! DirectionCell
            let task = recipe.tasks[indexPath.row - 4 - recipe.ingredients.count]
            cell.directionIndex.text = "\(indexPath.row - 3 - recipe.ingredients.count)."
            cell.directionContent.text = task.content
            return cell
        default:
            let cell:DirectionCell = tableView.dequeueReusableCell(withIdentifier: "directionCell", for: indexPath) as! DirectionCell
            return cell
        }
    }
    
    func ChocolateEspressoInitializer() -> Recipe {
        let recipe = Recipe()
        recipe.cookTime = 35
        recipe.prepTime = 15
        recipe.readyTime = 60
        recipe.name = "Chocolate Espresso Cake"
        recipe.forks = 11564
        recipe.improvNotes = ""
        recipe.isSecret = false
        recipe.author = "Jacob Williamson"
        recipe.ingredients = [Ingredient(sAmount: 2, sUnits: sUnit.cup, name: "all-purpose flour"),
                              Ingredient(sAmount: 2.5, sUnits: sUnit.cup, name: "sugar"),
                              Ingredient(sAmount: 0.75, sUnits: sUnit.cup, name: "unsweetened cocoa powder"),
                              Ingredient(sAmount: 2, sUnits: sUnit.tsp, name: "baking powder"),
                              Ingredient(sAmount: 1.5, sUnits: sUnit.tsp, name: "baking soda"),
                              Ingredient(sAmount: 0.5, sUnits: sUnit.tsp, name: "salt"),
                              Ingredient(sAmount: 1.5, sUnits: sUnit.tsp, name: "espresso powder"),
                              Ingredient(sAmount: 1, sUnits: sUnit.cup, name: "whole milk"),
                              Ingredient(sAmount: 0.5, sUnits: sUnit.cup, name: "vegetable oil"),
                              Ingredient(sAmount: 2, sUnits: sUnit.whole, name: "eggs"),
                              Ingredient(sAmount: 2, sUnits: sUnit.tsp, name: "vanilla extract"),
                              Ingredient(sAmount: 1, sUnits: sUnit.cup, name: "boiling water")]
        recipe.tasks = [Task(content: "Preheat oven to 350°F. Prepare two 9-inch cake pans by spraying with baking spray or buttering and lightly flouring."),
                        Task(content: "Add flour, sugar, cocoa, baking powder, baking soda, salt and espresso powder to a large bowl or the bowl of a stand mixer. Whisk through to combine or, using your paddle attachment, stir through flour mixture until combined well."),
                        Task(content: "Add milk, vegetable oil, eggs, and vanilla to flour mixture and mix together on medium speed until well combined. Reduce speed and carefully add boiling water to the cake batter. Beat on high spee for about 1 minute to add air to the batter."),
                        Task(content: "Distribute cake batter evenly between the two prepared cake pans (weight is 2lbs 10oz each). Bake for 30-35 minutes, until a toothpick or cake tester inserted in the center comes out clean."),
                        Task(content: "Remove from the oven and allow to cool for about 10 minutes, remove from the pan and cool completely."),
                        Task(content: "Frost cake with Chocolate Buttercream Frosting."),
        ]
        recipe.date = Date()
        recipe.coverImage = UIImage(named: "CakeImage")!
        recipe.score = 500
        recipe.improvNotes = "Turned out good. It needs more espresso powder"
        recipe.servings = 8
        return recipe
    }
    
    func didChangeServings(sender: UIStepper) {
        let updatedServings = sender.value
        let multiplier = updatedServings / Double(recipe.servings)
        recipe.servings = Int(updatedServings)
        for ingredient in recipe.ingredients {
            ingredient.standardAmount *= multiplier
        }
       self.table.reloadData()
        
    }
}


