"use strict"

class GridMap {
    /**
     * 
     * @param {number} w 
     * @param {number} l 
     */
    constructor(w, l) {        
        this.w = w
        this.l = l
    }
    get cw() {
        return this.w / this.l
    }
    display(ctx) {
        ctx.scale(this.cw, this.cw)
        for(let x = 1; x < 10; x++) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.l)
        }
        for(let y = 1; y < 10; y++) {
            ctx.moveTo(0, y)
            ctx.lineTo(this.l, y)
        }
        ctx.lineWidth = 2 / this.cw
        ctx.stroke()
    }
}

class PositionedNode {
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {?string} [colour]
     */
    constructor(x, y, colour = null) {
        this.x = x
        this.y = y
        this.colour = colour
    }
    display(ctx) {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.fillStyle = this.colour
        ctx.fillRect(0.1, 0.1, 0.8, 0.8)
        ctx.restore()
    }
}

var c = document.getElementById("grid")
if(c instanceof HTMLCanvasElement) {
    var ctx = c.getContext("2d")

    let map = new GridMap(500, 10)
    map.display(ctx)

    let obstructions = []
    for(let i = 0; i < 31; i++) {
        obstructions.push(new PositionedNode(
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 10),
            "red"
        ))
    }

    let start = new PositionedNode(
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        "green"
    )
    let finish = new PositionedNode(
        Math.floor(Math.random() * 10),
        Math.floor(Math.random() * 10),
        "blue"
    )
    obstructions.forEach(o => o.display(ctx))    
    start.display(ctx)
    finish.display(ctx)
} else {
    console.log("Well, that's the wrong element type")
}