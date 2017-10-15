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
        for(let x = 0; x <= 10; x++) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, this.l)
        }
        for(let y = 0; y <= 10; y++) {
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
    get nextSteps() {
        let steps = [];
        [-1, 1].forEach(o => {
            steps.push({x: o + this.x, y: this.y})
            steps.push({x: this.x, y: o + this.y})
        });
        [-1, 1].forEach(x => {
            [-1, 1].forEach(y => {
                steps.push({x: x + this.x, y: y + this.y})
            })
        })
        return steps
    }
    get position() {
        return {x: this.x, y: this.y}
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
     * @param {PositionedNode} target
     * @returns {?PositionedNode[]}
     */
    stepOut(ctx, target) {
        if(!this.routes) {
            this.routes = {
                0: [this],
                2: [],
                4: [],
            }
        }
        let new_routes = {
            4: [],
            6: [],
        }
        let route
        let route_found = this.routes[0].some(path => {
            return path.nextSteps.some(step => {
                if(this.map.validAddress(step.x, step.y)) {
                    let existing_node = this.map.nodeAt(step.x, step.y)
                    if(!existing_node) {
                        let p = new PathNode(step.x, step.y, path)
                        this.map.addNode(p)
                        p.display(ctx)
                        let cost = Math.abs(step.x - path.x) + Math.abs(step.y - path.y) > 1 ? 6 : 4
                        new_routes[cost].push(p)
                    } else if(
                        existing_node === target || (
                            existing_node instanceof PathNode && (
                                (this instanceof PathNode && existing_node.ownedBy !== this.ownedBy) ||
                                (!(this instanceof PathNode) && existing_node.ownedBy !== this)
                            )
                        )
                    ) {
                        route = [path, existing_node]
                        return true
                    }
                }
                return false
            })
        })
        this.routes = {
            0: this.routes[2],
            2: this.routes[4].concat(new_routes[4]),
            4: new_routes[6],
        }
        if(route_found) {
            console.log("Route found")
            return route
        } else if(Object.keys(this.routes).some(r => this.routes[r].length > 0)) {
            return null
        } else {
            return []
        }
    }
}

class PathNode extends PositionedNode {
    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {PositionedNode} from_node
     */
    constructor(x, y, from_node) {
        super(x, y, "black")
        this.from = from_node
        if(this.from instanceof PathNode) {
            this.ownedBy = this.from.ownedBy
        } else {
            this.ownedBy = this.from
        }
    }
}

class GridTest {
    constructor() {
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
    }
    init() {
        let c = document.getElementById("grid")
        if(c instanceof HTMLCanvasElement) {
            var ctx = c.getContext("2d")

            this.obstructions = []
            for(let i = 0; i < 31; i++) {
                this.obstructions.push(new PositionedNode(
                    Math.floor(Math.random() * 10),
                    Math.floor(Math.random() * 10),
                    "red"
                ))
            }

            this.start = new PositionedNode(
                Math.floor(Math.random() * 10),
                Math.floor(Math.random() * 10),
                "green"
            )
            do {
                this.finish = new PositionedNode(
                    Math.floor(Math.random() * 10),
                    Math.floor(Math.random() * 10),
                    "blue"
                )
            } while(
                this.finish.position.x == this.start.position.x &&
                this.finish.position.y == this.start.position.y
            )

            this.ctx = ctx
            ctx.save()

            let map = new GridMap(250, 10)
            map.display(this.ctx)

            this.obstructions.forEach(o => map.addNode(o))
            map.addNode(this.start) 
            map.addNode(this.finish) 

            this.map = map
            this.obstructions.forEach(o => o.display(this.ctx))    
            this.start.display(this.ctx)
            this.finish.display(this.ctx)

            document.querySelector("p#test-name").textContent = "Random test"
        } else {
            console.log("Well, that's the wrong element type")
        }
    }
    /**
     * 
     * @param {{start: {x: number, y: number}, finish: {x: number, y: number}, obstructions: {x: number, y: number}[]}} test 
     */
    initForTest(test) {
        this.start = new PositionedNode(
            test.start.x,
            test.start.y,
            "green"
        )
        this.finish = new PositionedNode(
            test.finish.x,
            test.finish.y,
            "blue"
        )
        this.obstructions = test.obstructions.map(pos => new PositionedNode(
            pos.x,
            pos.y,
            "red"
        ))
        let map = new GridMap(250, 10)
        this.ctx.restore()
        this.ctx.fillStyle = "white"
        this.ctx.fillRect(0, 0, 250, 250)
        this.ctx.save()
        map.display(this.ctx)

        this.obstructions.forEach(o => map.addNode(o))
        map.addNode(this.start) 
        map.addNode(this.finish) 

        this.map = map
        this.obstructions.forEach(o => o.display(this.ctx))    
        this.start.display(this.ctx)
        this.finish.display(this.ctx)
    }
    nextTest() {
        this.initForTest(this.tests[this.nextTestNumber])
        document.querySelector("p#test-name").textContent =
            this.tests[this.nextTestNumber].passed ?
                `Test ${this.nextTestNumber} (previously passed)` :
                `Test ${this.nextTestNumber}`
        if(!this.paused) {
            this.run()
        }
        this.nextTestNumber = (this.nextTestNumber + 1) % this.tests.length
    }
    run() {
        if(this.runInterval) {
            clearInterval(this.runInterval)
        }
        this.runInterval = setInterval(() => this.step(), 100)
    }
    step() {
        let route = this.start.stepOut(this.ctx, this.finish) ||
            this.finish.stepOut(this.ctx, this.start)
        if(route) {
            if(route.length) {
                let [a, b] = route
                while(a instanceof PathNode) {
                    a.colour = "orange"
                    a.display(this.ctx)
                    a = a.from
                }
                while(b instanceof PathNode) {
                    b.colour = "orange"
                    b.display(this.ctx)
                    b = b.from
                }
            } else {
                console.log("No route found")
            }
            if(this.runInterval) {
                clearTimeout(this.runInterval)
                this.runInterval = null
            }
            console.log("done")
            console.log(JSON.stringify({
                start: this.start.position,
                finish: this.finish.position,
                obstructions: this.obstructions.map(o => o.position)
            }))
        } else {
            this.start.stepRoutes(this.ctx)
            this.finish.stepRoutes(this.ctx)
        }
    }
}