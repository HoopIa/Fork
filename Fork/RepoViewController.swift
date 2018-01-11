//
//  RepoViewController.swift
//  Fork
//
//  Created by Jacob Williamson on 1/11/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//
import UIKit

class RepoViewController: UIViewController {

    @IBOutlet weak var lineChart: LineChart!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        lineChart.deltaX = 20
        lineChart.deltaY = 30
        let point1 = CGPoint(x: 0, y: 50)
        let point2 = CGPoint(x: 20, y: 60)
        let point3 = CGPoint(x: 40, y: 70)
        let point4 = CGPoint(x: 60, y: 40)
        let point5 = CGPoint(x: 80, y: 80)
        let point6 = CGPoint(x: 100, y: 100)
        lineChart.plot([point1,point2,point3,point4,point5,point6])
        
    }
}

