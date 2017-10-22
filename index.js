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
        this.newRoutes = {
            4: [],
            6: [],
        }
    }
    get nextSteps() {
        let steps = {
            cheap: [],
            expensive: [],
        };
        [-1, 1].forEach(o => {
            steps.cheap.push({x: o + this.x, y: this.y})
            steps.cheap.push({x: this.x, y: o + this.y})
        });
        [-1, 1].forEach(x => {
            [-1, 1].forEach(y => {
                steps.expensive.push({x: x + this.x, y: y + this.y})
            })
        })
        return steps
    }
    get position() {
        return {x: this.x, y: this.y}
    }
    display(ctx, colour = null) {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.fillStyle = colour || this.colour
        ctx.fillRect(0.1, 0.1, 0.8, 0.8)
        ctx.restore()
    }
    /**
     *
     * @param {*} ctx
     * @param {PositionedNode} target
     * @param {boolean} cheap
     * @returns {?Route}
     */
    stepOut(ctx, target, cheap) {
        if(!this.routes) {
            this.routes = {
                0: [this],
                2: [],
                4: [],
                6: [],
            }
        }
        let route

        let step_type = cheap ? "cheap" : "expensive"
        let route_found = this.routes[0].some(path => {
            return path.nextSteps[step_type].some(step => {
                if(this.map.validAddress(step.x, step.y)) {
                    let existing_node = this.map.nodeAt(step.x, step.y)
                    if(!existing_node) {
                        let p = new PathNode(step.x, step.y, path, "light" + this.colour)
                        let cost = Math.abs(step.x - path.x) + Math.abs(step.y - path.y) > 1 ? 6 : 4
                        this.newRoutes[cost].push(p)
                    } else if(
                        existing_node === target || (
                            existing_node instanceof PathNode && (
                                (this instanceof PathNode && existing_node.ownedBy !== this.ownedBy) ||
                                (!(this instanceof PathNode) && existing_node.ownedBy !== this)
                            )
                        )
                    ) {
                        route = new Route(path, existing_node)
                        return true
                    }
                }
                return false
            })
        })
        if(route_found) {
            console.log("Route found")
            return route
        } else if(
            Object.keys(this.newRoutes).some(r => this.newRoutes[r].length > 0) ||
            Object.keys(this.routes).some(r => this.routes[r].length > 0)
        ) {
            return null
        } else {
            return new Route(null, null)
        }
    }
    stepRoutes(ctx) {
        this.routes[0].forEach(path => {
            if(path !== this) path.display(ctx, "black")
        })
        Object.keys(this.newRoutes).forEach(cost => {
            this.newRoutes[cost].forEach(p => {
                this.map.addNode(p)
                p.display(ctx)
            })
        })
        this.routes = {
            0: this.routes[2],
            2: this.routes[4].concat(this.newRoutes[4]),
            4: this.routes[6].concat(this.newRoutes[6]),
            6: [],
        }
        this.newRoutes = {
            4: [],
            6: [],
        }
    }
}

class PathNode extends PositionedNode {
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {PositionedNode} from_node
     * @param {string} hint_colour
     */
    constructor(x, y, from_node, hint_colour) {
        super(x, y, hint_colour)
        this.from = from_node
        if(this.from instanceof PathNode) {
            this.ownedBy = this.from.ownedBy
        } else {
            this.ownedBy = this.from
        }
    }
}

class Route {
    constructor(left, right) {
        this.left = left
        this.right = right
    }
    get cost() {
        if(!this.left) return Infinity
        let [a, b] = [this.left, this.right]
        let cost = 0
        if(a.x == b.x || a.y == b.y) {
            cost += 4
        } else {
            cost += 6
        }
        while(a instanceof PathNode) {
            if(a.from.x == a.x || a.from.y == a.y) {
                cost += 4
            } else {
                cost += 6
            }
            a = a.from
        }
        while(b instanceof PathNode) {
            if(b.from.x == b.x || b.from.y == b.y) {
                cost += 4
            } else {
                cost += 6
            }
            b = b.from
        }
        return cost
    }
    display(ctx) {
        let [a, b] = [this.left, this.right]
        while(a instanceof PathNode) {
            a.colour = "orange"
            a.display(ctx)
            a = a.from
        }
        while(b instanceof PathNode) {
            b.colour = "orange"
            b.display(ctx)
            b = b.from
        }
    }
}

class GridTest {
    constructor() {
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
        this.currentTest = null
        this.rejectPromise = null
        this.resolvePromise = null
    }
    get testNumber() {
        return this._testNumber
    }
    /** @param {?number} v */
    set testNumber(v) {
        this._testNumber = v
        document.querySelector("input#test-number").value =
            (v === null) ? "" : v
    }
    init() {
        let c = document.getElementById("grid")
        if(c instanceof HTMLCanvasElement) {
            var ctx = c.getContext("2d")
            this.ctx = ctx
        } else {
            console.log("Well, that's the wrong element type")
        }
    }
    initForRandom() {
        this.currentTest = null
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

        this.ctx.restore()
        this.ctx.fillStyle = "white"
        this.ctx.fillRect(0, 0, 250, 250)
        this.ctx.save()

        let map = new GridMap(250, 10)
        map.display(this.ctx)

        this.obstructions.forEach(o => map.addNode(o))
        map.addNode(this.start)
        map.addNode(this.finish)

        this.map = map
        this.obstructions.forEach(o => o.display(this.ctx))
        this.start.display(this.ctx)
        this.finish.display(this.ctx)

        this.testNumber = null
    }
    /**
     *
     * @param {{start: {x: number, y: number}, finish: {x: number, y: number}, obstructions: {x: number, y: number}[], passed: boolean, correctLength: number}} test
     */
    initForTest(test) {
        this.currentTest = test
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
        this.testNumber = this.nextTestNumber
        if(!this.paused) {
            this.run()
        }
        this.nextTestNumber = (this.nextTestNumber + 1) % this.tests.length
    }
    randomTest() {
        this.initForRandom()
        this.testNumber = null
        if(!this.paused) {
            this.run()
        }
    }
    run(interval_ms = 100) {
        if(this.runInterval) {
            clearInterval(this.runInterval)
        }
        if(this.rejectPromise) {
            this.rejectPromise()
        }
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve
            this.rejectPromise = reject
            this.runInterval = setInterval(() => this.step(), interval_ms)
        })
    }
    runAll() {
        return this.tests.reduce(
            (carry, test, i) => carry.then(() => {
                this.initForTest(test)
                this.testNumber = i
                return this.run(10)
            }),
            new Promise(resolve => resolve())
        )
    }
    selectTest(n) {
        this.initForTest(this.tests[n])
        this.testNumber = n
        if(!this.paused) {
            this.run()
        }
    }
    step() {
        let possible_routes = [
            this.start.stepOut(this.ctx, this.finish, true),
            this.finish.stepOut(this.ctx, this.start, true),
            this.start.stepOut(this.ctx, this.finish, false),
            this.finish.stepOut(this.ctx, this.start, false),
        ].filter(route => route)

        let route = possible_routes.sort((a, b) => a.cost - b.cost)[0]
        if(route) {
            if(route.left) {
                route.display(this.ctx)
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
            let tr = document.createElement("tr")
            let td = document.createElement("td")
            td.textContent = this.testNumber === null ?
                "Random test" :
                `Test ${this.testNumber}`
            tr.appendChild(td)
            td = document.createElement("td")
            td.textContent = route.cost === Infinity ? "miss" : "" + route.cost
            tr.appendChild(td)
            td = document.createElement("td")
            td.textContent = this.testNumber === null ?
                "N/A" :
                "" + this.currentTest.correctLength
            tr.appendChild(td)

            if(this.currentTest && this.currentTest.correctLength < route.cost) {
                tr.style.color = "red"
            }
            document.querySelector("#test-results").appendChild(
                tr
            )
            if(this.resolvePromise) {
                this.resolvePromise()
            }
        } else {
            this.start.stepRoutes(this.ctx)
            this.finish.stepRoutes(this.ctx)
        }
    }
}