//
//  RecipeViewController.swift
//  Fork
//
//  Created by Jacob Williamson on 1/11/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import UIKit

class RecipeViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        let imageName = "CakeImage"
        let image = UIImage(named: imageName)
        let imageView = UIImageView(image: image!)
        
        imageView.frame = CGRect(x: 0, y: 0, width: view.bounds.width, height: view.bounds.height/3)
        view.addSubview(imageView)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    

}
