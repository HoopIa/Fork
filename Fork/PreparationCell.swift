//
//  PreparationCell.swift
//  Fork
//
//  Created by Jacob Williamson on 1/23/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import UIKit

class PreparationCell: UITableViewCell {
    @IBOutlet weak var prepTime: UILabel!
    @IBOutlet weak var cookTime: UILabel!
    @IBOutlet weak var totalTime: UILabel!
    @IBOutlet weak var servingNumber: UILabel!
    @IBOutlet weak var stepper: UIStepper!
    
    override func awakeFromNib() {
        super.awakeFromNib()
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
}
