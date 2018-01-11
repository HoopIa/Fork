//
//  LineChart.swift
//  Fork
//
//  Created by Jacob Williamson on 1/11/18.
//  Copyright © 2018 Jacob Williamson. All rights reserved.
//


import UIKit

extension String {
    func size(withSystemFontSize pointSize: CGFloat) -> CGSize {
        return (self as NSString).size(attributes: [NSFontAttributeName: UIFont.systemFont(ofSize: pointSize)])
    }
}

extension CGPoint {
    func adding(x: CGFloat) -> CGPoint { return CGPoint(x: self.x + x, y: self.y) }
    func adding(y: CGFloat) -> CGPoint { return CGPoint(x: self.x, y: self.y + y) }
}

class LineChart: UIView {
    
    let lineLayer = CAShapeLayer()
    let circlesLayer = CAShapeLayer()
    
    var chartTransform: CGAffineTransform?
    
    @IBInspectable var lineColor: UIColor = UIColor.green {
        didSet {
            lineLayer.strokeColor = lineColor.cgColor
        }
    }
    
    @IBInspectable var lineWidth: CGFloat = 1
    
    @IBInspectable var showPoints: Bool = true { // show the circles on each data point
        didSet {
            circlesLayer.isHidden = !showPoints
        }
    }
    
    @IBInspectable var circleColor: UIColor = UIColor.green {
        didSet {
            circlesLayer.fillColor = circleColor.cgColor
        }
    }
    
    @IBInspectable var circleSizeMultiplier: CGFloat = 3
    
    @IBInspectable var axisColor: UIColor = UIColor.white
    @IBInspectable var showInnerLines: Bool = true
    @IBInspectable var labelFontSize: CGFloat = 10
    
    var axisLineWidth: CGFloat = 1
    var deltaX: CGFloat = 10 // The change between each tick on the x axis
    var deltaY: CGFloat = 10 // and y axis
    var xMax: CGFloat = 100
    var yMax: CGFloat = 100
    var xMin: CGFloat = 0
    var yMin: CGFloat = 0
    
    var data: [CGPoint]?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        combinedInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        combinedInit()
    }
    
    func combinedInit() {
        layer.addSublayer(lineLayer)
        lineLayer.fillColor = UIColor.clear.cgColor
        lineLayer.strokeColor = lineColor.cgColor
        
        layer.addSublayer(circlesLayer)
        circlesLayer.fillColor = circleColor.cgColor
        
        layer.borderWidth = 1
        layer.borderColor = axisColor.cgColor
    }
    
    
    override func layoutSubviews() {
        super.layoutSubviews()
        lineLayer.frame = bounds
        circlesLayer.frame = bounds
        
        if let d = data{
            setTransform(minX: xMin, maxX: xMax, minY: yMin, maxY: yMax)
            plot(d)
        }
    }
    
    func plot(_ points: [CGPoint]) {
        lineLayer.path = nil
        circlesLayer.path = nil
        data = nil
        
        guard !points.isEmpty else { return }
        
        self.data = points
        
        if self.chartTransform == nil {
            setAxisRange(forPoints: points)
        }
        
        let linePath = CGMutablePath()
        linePath.addLines(between: points, transform: chartTransform!)
        
        lineLayer.path = linePath
        
        if showPoints {
            circlesLayer.path = circles(atPoints: points, withTransform: chartTransform!)
        }
    }
    
    func setAxisRange(forPoints points: [CGPoint]) {
        guard !points.isEmpty else { return }
        
        let xs = points.map() { $0.x }
        let ys = points.map() { $0.y }
        
        xMax = ceil(xs.max()! / deltaX) * deltaX
        yMax = ceil(ys.max()! / deltaY) * deltaY
        xMin = 0
        yMin = 0
        setTransform(minX: xMin, maxX: xMax, minY: yMin, maxY: yMax)
    }
    
    func setAxisRange(xMin: CGFloat, xMax: CGFloat, yMin: CGFloat, yMax: CGFloat) {
        self.xMin = xMin
        self.xMax = xMax
        self.yMin = yMin
        self.yMax = yMax
        
        setTransform(minX: xMin, maxX: xMax, minY: yMin, maxY: yMax)
    }
    
    func setTransform(minX: CGFloat, maxX: CGFloat, minY: CGFloat, maxY: CGFloat) {
        
        let xLabelSize = "\(Int(maxX))".size(withSystemFontSize: labelFontSize)
        
        let yLabelSize = "\(Int(maxY))".size(withSystemFontSize: labelFontSize)
        
        let xOffset = xLabelSize.height + 2
        let yOffset = yLabelSize.width + 5
        
        let xScale = (bounds.width - yOffset - xLabelSize.width/2 - 2)/(maxX - minX)
        let yScale = (bounds.height - xOffset - yLabelSize.height/2 - 2)/(maxY - minY)
        
        chartTransform = CGAffineTransform(a: xScale, b: 0, c: 0, d: -yScale, tx: yOffset, ty: bounds.height - xOffset)
        
        setNeedsDisplay()
    }
    
    func circles(atPoints points: [CGPoint], withTransform t: CGAffineTransform) -> CGPath {
        
        let path = CGMutablePath()
        let radius = lineLayer.lineWidth * circleSizeMultiplier/2
        for i in points {
            let p = i.applying(t)
            let rect = CGRect(x: p.x - radius, y: p.y - radius, width: radius * 2, height: radius * 2)
            path.addEllipse(in: rect)
            
        }
        
        return path
    }
    
    override func draw(_ rect: CGRect) {
        // draw rect comes with a drawing context, so lets grab it.
        // Also, if there is not yet a chart transform, we will bail on performing any other drawing.
        // I like guard statements for this because it's kind of like a bouncer to a bar.
        // If you don't have your transform yet, you can't enter drawAxes.
        guard let context = UIGraphicsGetCurrentContext(), let t = chartTransform else { return }
        drawAxes(in: context, usingTransform: t)
    }
    
    func drawAxes(in context: CGContext, usingTransform t: CGAffineTransform) {
        context.saveGState()
        
        // make two paths, one for thick lines, one for thin
        let thickerLines = CGMutablePath()
        let thinnerLines = CGMutablePath()
        
        // the two line chart axes
        let xAxisPoints = [CGPoint(x: xMin, y: 0), CGPoint(x: xMax, y: 0)]
        let yAxisPoints = [CGPoint(x: 0, y: yMin), CGPoint(x: 0, y: yMax)]
        
        // add each to thicker lines but apply our transform too.
        thickerLines.addLines(between: xAxisPoints, transform: t)
        thickerLines.addLines(between: yAxisPoints, transform: t)
        
        // next we go from xMin to xMax by deltaX using stride
        for x in stride(from: xMin, through: xMax, by: deltaX) {
            
            // tick points are the points for the ticks on each axis
            // we check showInnerLines first to see if we are drawing small ticks or full lines
            // tip for new guys: `let a = someBool ? b : c`  is called a ternary operator
            // in english it means "let a = b if somebool is true, or c if it is false."
            
            let tickPoints = showInnerLines ?
                [CGPoint(x: x, y: yMin).applying(t), CGPoint(x: x, y: yMax).applying(t)] :
                [CGPoint(x: x, y: 0).applying(t), CGPoint(x: x, y: 0).applying(t).adding(y: -5)]
            
            
            thinnerLines.addLines(between: tickPoints)
            
            if x != xMin {  // draw the tick label (it is too buy if you draw it at the origin for both x & y
                let label = "\(Int(x))" as NSString // Int to get rid of the decimal, NSString to draw
                let labelSize = "\(Int(x))".size(withSystemFontSize: labelFontSize)
                let labelDrawPoint = CGPoint(x: x, y: 0).applying(t)
                    .adding(x: -labelSize.width/2)
                    .adding(y: 1)
                
                label.draw(at: labelDrawPoint,
                           withAttributes:
                    [NSFontAttributeName: UIFont.systemFont(ofSize: labelFontSize),
                     NSForegroundColorAttributeName: axisColor])
            }
        }
        // repeat for y
        for y in stride(from: yMin, through: yMax, by: deltaY) {
            
            let tickPoints = showInnerLines ?
                [CGPoint(x: xMin, y: y).applying(t), CGPoint(x: xMax, y: y).applying(t)] :
                [CGPoint(x: 0, y: y).applying(t), CGPoint(x: 0, y: y).applying(t).adding(x: 5)]
            
            
            thinnerLines.addLines(between: tickPoints)
            
            if y != yMin {
                let label = "\(Int(y))" as NSString
                let labelSize = "\(Int(y))".size(withSystemFontSize: labelFontSize)
                let labelDrawPoint = CGPoint(x: 0, y: y).applying(t)
                    .adding(x: -labelSize.width - 1)
                    .adding(y: -labelSize.height/2)
                
                label.draw(at: labelDrawPoint,
                           withAttributes:
                    [NSFontAttributeName: UIFont.systemFont(ofSize: labelFontSize),
                     NSForegroundColorAttributeName: axisColor])
            }
        }
        // finally set stroke color & line width then stroke thick lines, repeat for thin
        context.setStrokeColor(axisColor.cgColor)
        context.setLineWidth(axisLineWidth)
        context.addPath(thickerLines)
        context.strokePath()
        
        context.setStrokeColor(axisColor.withAlphaComponent(0.5).cgColor)
        context.setLineWidth(axisLineWidth/2)
        context.addPath(thinnerLines)
        context.strokePath()
        
        context.restoreGState()
        // whenever you change a graphics context you should save it prior and restore it after
        // if we were using a context other than draw(rect) we would have to also end the graphics context
    }
}
