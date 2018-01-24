//
//  TitleCell.swift
//  Fork
//
//  Created by Jacob Williamson on 1/23/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//

import UIKit

class TitleCell: UITableViewCell {
    @IBOutlet weak var recipeTitle: UILabel!
    @IBOutlet weak var recipeAuthor: UIButton!
    @IBOutlet weak var recipeForkCount: UIButton!
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }

}
