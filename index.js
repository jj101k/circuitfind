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
        /** @type {?PositionedNode[]} */
        this.nodes = Array(l * l)
    }
    get cw() {
        return this.w / this.l
    }
    /**
     * 
     * @param {PositionedNode} n 
     */
    addNode(n) {
        this.nodes[n.x + n.y * this.l] = n
        n.map = this
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
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {?PositionedNode}
     */
    nodeAt(x, y) {
        return this.nodes[x + y * this.l]
    }
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @returns {?boolean}
     */
    validAddress(x, y) {
        return x >= 0 && y >= 0 && x < this.l && y < this.l
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
        /** @type {GridMap} */
        this.map = null
    }
    display(ctx) {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.fillStyle = this.colour
        ctx.fillRect(0.1, 0.1, 0.8, 0.8)
        ctx.restore()
    }
    /**
     * 
     * @param {*} ctx 
     * @returns {number}
     */
    stepOut(ctx) {
        if(!this.routes) {
            this.routes = [[this]]
        }
        let new_routes = []
        let steps_taken = 0
        this.routes.forEach(path => {
            /*
            [1, -1].forEach(x => {
                [1, -1].forEach(y => {
                    if(!this.map.nodeAt(x + path[0].x, y + path[0].y)) {
                        let p = new PositionedNode(x + path[0].x, y + path[0].y, "black")
                        this.map.addNode(p)
                        p.display(ctx)
                        new_routes.push(
                            [p].concat(path)
                        )
                    }
                })
            })
            */
            [1, -1].forEach(x => {
                if(
                    this.map.validAddress(x + path[0].x, path[0].y) &&
                    !this.map.nodeAt(x + path[0].x, path[0].y)
                ) {
                    steps_taken++
                    let p = new PositionedNode(x + path[0].x, path[0].y, "black")
                    this.map.addNode(p)
                    p.display(ctx)
                    new_routes.push(
                        [p].concat(path)
                    )
                }
            });
            [1, -1].forEach(y => {
                if(
                    this.map.validAddress(path[0].x, y + path[0].y) &&
                    !this.map.nodeAt(path[0].x, y + path[0].y)
                ) {
                    steps_taken++                    
                    let p = new PositionedNode(path[0].x, y + path[0].y, "black")
                    this.map.addNode(p)
                    p.display(ctx)
                    new_routes.push(
                        [p].concat(path)
                    )
                }
            })
        })
        this.routes = new_routes
        return steps_taken
    }
}

class GridTest {
    init() {
        let c = document.getElementById("grid")
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
            obstructions.forEach(o => map.addNode(o))
            map.addNode(start) 
            map.addNode(finish) 
            obstructions.forEach(o => o.display(ctx))    
            start.display(ctx)
            finish.display(ctx)

            start.stepOut(ctx)
            finish.stepOut(ctx)

            let i = setInterval(() => {
                if(!start.stepOut(ctx) && !finish.stepOut(ctx)) {
                    clearTimeout(i)
                    console.log("done")
                }
            }, 1000)

            this.map = map
        } else {
            console.log("Well, that's the wrong element type")
        }
    }
}