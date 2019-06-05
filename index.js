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
        /** @type {number[]} */
        this.nodes = Array(Math.ceil(l * l / 2)).map(v => 0)
    }
    get cw() {
        return this.w / this.l
    }
    /**
     *
     * @param {PositionedNode} n
     * @param {boolean} overwrite
     * @returns {boolean}
     */
    addNode(n, overwrite = false) {
        let address = n.x + n.y * this.l
        let offset = Math.floor(address / 2)
        let bottom = address % 2
        let existing_node = bottom ?
            (this.nodes[offset] & 0b1111) :
            (this.nodes[offset] >> 4)
        if(overwrite || !existing_node) {
            if(bottom) {
                this.nodes[offset] =
                    (this.nodes[offset] & 0b11110000) + (n.content & 0b1111)
            } else {
                this.nodes[offset] =
                    ((n.content & 0b1111) << 4) + (this.nodes[offset] & 0b1111)
            }
            return true
        } else {
            return false
        }
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {number}
     */
    contentAt(x, y) {
        let address = x + y * this.l
        let offset = address >> 1
        let bottom = address & 1
        return bottom ?
            (this.nodes[offset] & 0b1111) :
            (this.nodes[offset] >> 4)
    }
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    display(ctx) {
        ctx.fillStyle = this.cw > 10 ? "white" : "#888"
        ctx.fillRect(0, 0, this.l, this.l)
        ctx.beginPath()
        ctx.strokeStyle = "black"
        if(this.cw >= 3) {
            for(let x = 0; x <= this.l; x++) {
                ctx.moveTo(x, 0)
                ctx.lineTo(x, this.l)
            }
            for(let y = 0; y <= this.l; y++) {
                ctx.moveTo(0, y)
                ctx.lineTo(this.l, y)
            }
            ctx.lineWidth = 2 / this.cw
            ctx.stroke()
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {PositionedNode} node
     * @param {function(): void} action
     */
    displayNode(grid_map, ctx, node, action) {
        ctx.save()
        ctx.translate(node.x, node.y)
        action()
        ctx.restore()
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {?PositionedNode}
     */
    nodeAt(x, y) {
        return PositionedNode.nodeFor(
            x,
            y,
            this.contentAt(x, y)
        )
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
     * @param {number} content 0-15
     * @returns {?PositionedNode}
     */
    static nodeFor(x, y, content) {
        if(content & 0b1000) {
            return new PathNode(x, y, content)
        } else if(content == 0b0111) {
            return new ObstructionNode(x, y)
        } else if(content > 0) {
            return new StartNode(x, y, content)
        } else {
            return null
        }
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} content 0-15
     */
    constructor(x, y, content) {
        this.x = x
        this.y = y
        this.content = content
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
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} colour
     */
    display(grid_map, ctx, colour) {
        grid_map.displayNode(grid_map, ctx, this, () => {
            ctx.fillStyle = colour
            ctx.fillRect(0.125, 0.125, 0.75, 0.75)
        })
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {boolean}
     */
    inMap(grid_map) {
        let n = grid_map.nodeAt(this.x, this.y)
        return n instanceof this.constructor
    }
}

class ObstructionNode extends PositionedNode {
    /**
     *
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        super(x, y, 0b111)
    }
}

class StartNode extends PositionedNode {
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} index 1-6
     */
    constructor(x, y, index) {
        super(x, y, index)
    }
    get colour() {
        return this.content & 1 ? "blue" : "green"
    }
}

class RouteStepper {
    /**
     *
     * @param {StartNode} start_node
     */
    constructor(start_node) {
        this.startNode = start_node
        /** @type {{[x: number]: (PathNode|StartNode)[]}} */
        this.newRoutes = {
            4: [],
            6: [],
        }
        /** @type {{[x: number]: (PathNode|StartNode)[]}} */
        this.routes = {
            0: [this.startNode],
            2: [],
            4: [],
            6: [],
        }
    }
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {PositionedNode} target
     * @param {boolean} cheap
     * @param {GridMap} grid_map
     * @returns {?Route}
     */
    stepOut(ctx, target, cheap, grid_map) {
        let route

        let step_type = cheap ? "cheap" : "expensive"
        /** @type {number[]} */
        let leaf_uids = Object.keys(this.routes).reduce(
            (carry, item) => carry.concat(this.routes[item].map(p => p.x + grid_map.l * p.y)),
            []
        )
        let route_found = this.routes[0].some(path => {
            return path.nextSteps[step_type].some(step => {
                if(grid_map.validAddress(step.x, step.y)) {
                    let existing_node = grid_map.nodeAt(step.x, step.y)
                    let step_uid = step.x + grid_map.l * step.y
                    if(!existing_node) {
                        let p = new PathNode(
                            step.x,
                            step.y,
                            PathNode.fromDirection(step.x, step.y, path)
                        )
                        let cost = Math.abs(step.x - path.x) + Math.abs(step.y - path.y) > 1 ? 6 : 4
                        this.newRoutes[cost].push(p)
                    } else if(
                        (
                            existing_node.content == target.content
                        ) || (
                            existing_node.content & 0b1000 &&
                            (existing_node = grid_map.nodeAt(step.x, step.y)) &&
                            existing_node instanceof PathNode &&
                            existing_node.isLeafNode(grid_map) &&
                            !leaf_uids.some(uid => uid == step_uid) &&
                            existing_node.getOwner(grid_map).content != this.startNode.content
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
            return new Route()
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} blind
     * @param {number} cost
     */
    linkRoutes(grid_map, ctx, blind, cost) {
        this.newRoutes[cost].forEach(p => {
            if(grid_map.addNode(p) && !blind) {
                p.display(grid_map, ctx, "light" + this.startNode.colour)
            }
        })
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} blind
     */
    stepRoutes(grid_map, ctx, blind) {
        // this.routes[0] = this.routes[0].filter(p => p.inMap(grid_map))
        if(!blind) {
            this.routes[0].forEach(path => {
                if(path instanceof PathNode) path.display(grid_map, ctx, "black")
            })
        }
        this.routes = {
            0: this.routes[2],
            2: this.routes[4].concat(this.newRoutes[4].filter(p => p.inMap(grid_map))),
            4: this.routes[6].concat(this.newRoutes[6].filter(p => p.inMap(grid_map))),
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
     */
    static fromDirection(x, y, from_node) {
        let dx = x - from_node.x
        let dy = y - from_node.y
        if(Math.abs(dx) - Math.abs(dy) == 0) {
            // diagonal
            return 4 + Math.abs(dx) + dx + (Math.abs(dy) + dy)/2
        } else {
            // straight
            return Math.abs(dx) + dx + dy + 1
        }
    }
    /**
     * The position a node came from.
     *
     * 7 2 5
     * 3   1
     * 6 0 4
     *
     * @param {number} x
     * @param {number} y
     * @param {number} from_direction
     */
    static getFromPosition(x, y, from_direction) {
        if(from_direction >= 4) {
            let t = from_direction - 4
            let dx = (t & 2) - 1
            let dy = (t % 2) * 2 - 1
            return {x: x - dx, y: y - dy}
        } else {
            let t = from_direction - 1
            if(t % 2) {
                // -1, 1
                return {x: x, y: y - t}
            } else {
                // 0, 2
                return {x: x - t + 1, y: y}
            }
        }
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {number} fromDirection 0-7 or 8+(0-7)
     */
    constructor(x, y, fromDirection) {
        super(x, y, 0b1000 | fromDirection)
    }
    get fromDirection() {
        return this.content & 0b111
    }
    /**
     * The position this node came from.
     */
    get fromPosition() {
        return PathNode.getFromPosition(this.x, this.y, this.fromDirection)
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} colour
     */
    display(grid_map, ctx, colour) {
        super.display(grid_map, ctx, colour)
        grid_map.displayNode(grid_map, ctx, this, grid_map.cw > 10 ? () => {
            ctx.scale(0.1, 0.1)
            ctx.font = "8px Arial"
            ctx.fillStyle = "#888"
            ctx.fillText("" + this.fromDirection, 2, 8)
        } : () => {})
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {StartNode}
     */
    getOwner(grid_map) {
        let c, position
        for(
            c = this.content, position = {x: this.x, y: this.y};
            c & 0b1000;
            position = PathNode.getFromPosition(position.x, position.y, c & 0b111),
            c = grid_map.contentAt(position.x, position.y)
        ) ;
        // @ts-ignore
        return grid_map.nodeAt(position.x, position.y)
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {StartNode | PathNode}
     */
    getPreviousNode(grid_map) {
        let position = this.fromPosition
        let n = grid_map.nodeAt(position.x, position.y)
        if(n instanceof PathNode || n instanceof StartNode) {
            return n
        } else {
            throw new Error("Bad previous node")
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {boolean}
     */
    inMap(grid_map) {
        let n = grid_map.nodeAt(this.x, this.y)
        return n instanceof PathNode && n.fromDirection == this.fromDirection
    }
    /**
     * True if this is a leaf node, ie a non-target.
     *
     * @param {GridMap} grid_map
     * @returns {boolean}
     */
    isLeafNode(grid_map) {
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x || y) {
                    let c = grid_map.contentAt(this.x + x, this.y + y)
                    if(c & 0b1000) {
                        let pos = PathNode.getFromPosition(
                            this.x + x,
                            this.y + y,
                            c
                        )
                        if(pos.x == this.x && pos.y == this.y) return false
                    }
                }
            }
        }
        return true
    }
}

class Route {
    /**
     *
     * @param {PositionedNode} left
     * @param {PositionedNode} right
     */
    constructor(left = null, right = null) {
        this.left = left
        this.right = right
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     */
    display(grid_map, ctx) {
        this.getNodes(grid_map).forEach(n => {
            if(n.position.x == this.left.x && n.position.y == this.left.y) {
                n.display(grid_map, ctx, "pink")
            } else if(n.position.x == this.right.x && n.position.y == this.right.y) {
                n.display(grid_map, ctx, "yellow")
            } else {
                n.display(grid_map, ctx, "orange")
            }
        })
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {number}
     */
    getCost(grid_map) {
        if(!this.left) return Infinity
        let [a, b] = [this.left, this.right]
        let cost = 0
        if(a.x == b.x || a.y == b.y) {
            cost += 4
        } else {
            cost += 6
        }
        this.getNodes(grid_map).forEach(n => {
            if(n.fromPosition.x == n.x || n.fromPosition.y == n.y) {
                cost += 4
            } else {
                cost += 6
            }
        })
        return cost
    }
    /**
     *
     * @param {GridMap} grid_map
     * @return {PathNode[]}
     */
    getNodes(grid_map) {
        let [a, b] = [this.left, this.right]
        let nodes = []
        while(a instanceof PathNode) {
            nodes.push(a)
            a = grid_map.nodeAt(a.fromPosition.x, a.fromPosition.y)
        }
        while(b instanceof PathNode) {
            nodes.unshift(b)
            b = grid_map.nodeAt(b.fromPosition.x, b.fromPosition.y)
        }
        return nodes
    }
}

/**
 * @typedef testSignature
 * @property {{x: number, y: number}} start
 * @property {{x: number, y: number}} finish
 * @property {{x: number, y: number}[]} obstructions
 * @property {?boolean} passed
 * @property {?number} correctLength
 * @property {?number} size
 */

class GridTest {
    constructor() {
        this.blind = false
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
        this.currentTest = null
        this.rejectPromise = null
        this.resolvePromise = null
        this.size = null
    }
    /** @type {testSignature} */
    get generatedState() {
        return {
            start: this.start.position,
            finish: this.finish.position,
            obstructions: this.obstructions.map(o => o.position),
            passed: null,
            correctLength: null,
            size: this.size,
        }
    }
    get testNumber() {
        return this._testNumber
    }
    /** @param {?number} v */
    set testNumber(v) {
        this._testNumber = v
        let input = document.querySelector("input#test-number")
        if(input instanceof HTMLInputElement) {
            input.value = (v === null) ? "" : ("" + v)
        }
    }
    dumpGeneratedState() {
        console.log(JSON.stringify(this.generatedState))
    }
    buildContext(w = null, l = 10) {
        let c = document.getElementById("grid")
        if(c instanceof HTMLCanvasElement) {
            c.width = c.clientWidth * window.devicePixelRatio
            c.height = c.clientHeight * window.devicePixelRatio
            if(!w) w = c.width
            const ctx = c.getContext("2d")
            ctx.restore()
            ctx.save()
            ctx.scale(w / l, w / l)
            this.ctx = ctx
            return w
        } else {
            console.log("Well, that's the wrong element type")
        }
    }
    /**
     *
     * @param {number} [s]
     */
    initForRandom(s = 10) {
        this.currentTest = null
        /** @type {ObstructionNode[]} */
        this.obstructions = []
        this.size = s
        let m = Math.floor(s * s / 2)
        for(let i = 0; i < m; i++) {
            this.obstructions.push(new ObstructionNode(
                Math.floor(Math.random() * s),
                Math.floor(Math.random() * s)
            ))
        }

        this.start = new StartNode(
            Math.floor(Math.random() * s),
            Math.floor(Math.random() * s),
            1
        )
        this.routeStart = new RouteStepper(this.start)
        do {
            this.finish = new StartNode(
                Math.floor(Math.random() * s),
                Math.floor(Math.random() * s),
                2
            )
        } while(
            this.finish.position.x == this.start.position.x &&
            this.finish.position.y == this.start.position.y
        )
        this.routeFinish = new RouteStepper(this.finish)

        let w = this.buildContext(null, s)
        let grid_map = new GridMap(w, s)
        grid_map.display(this.ctx)

        this.obstructions.forEach(o => grid_map.addNode(o, true))
        grid_map.addNode(this.start, true)
        grid_map.addNode(this.finish, true)

        this.obstructions = this.obstructions.filter(
            o => o.inMap(grid_map)
        )

        this.gridMap = grid_map
        this.obstructions.forEach(o => o.display(grid_map, this.ctx, "red"))
        this.start.display(grid_map, this.ctx, "green")
        this.finish.display(grid_map, this.ctx, "blue")

        this.testNumber = null
    }
    /**
     *
     * @param {testSignature} test
     */
    initForTest(test) {
        this.currentTest = test
        this.start = new StartNode(
            test.start.x,
            test.start.y,
            1
        )
        this.routeStart = new RouteStepper(this.start)
        this.finish = new StartNode(
            test.finish.x,
            test.finish.y,
            2
        )
        this.routeFinish = new RouteStepper(this.finish)
        this.obstructions = test.obstructions.map(pos => new ObstructionNode(
            pos.x,
            pos.y
        ))
        this.size = test.size || 10
        let w = this.buildContext(null, this.size)
        let grid_map = new GridMap(w, this.size)
        grid_map.display(this.ctx)

        this.obstructions.forEach(o => grid_map.addNode(o, true))
        grid_map.addNode(this.start, true)
        grid_map.addNode(this.finish, true)

        this.obstructions = this.obstructions.filter(
            o => o.inMap(grid_map)
        )

        this.gridMap = grid_map
        this.obstructions.forEach(o => o.display(grid_map, this.ctx, "red"))
        this.start.display(grid_map, this.ctx, "green")
        this.finish.display(grid_map, this.ctx, "blue")
    }
    nextTest() {
        this.initForTest(this.tests[this.nextTestNumber])
        this.testNumber = this.nextTestNumber
        if(!this.paused) {
            this.run()
        }
        this.nextTestNumber = (this.nextTestNumber + 1) % this.tests.length
    }
    /**
     *
     * @param {number} [s]
     */
    randomTest(s = 10) {
        this.initForRandom(s)
        this.testNumber = null
        if(!this.paused) {
            if(this.blind) {
                let running = true
                setTimeout(() => {
                    let start = new Date().valueOf()
                    while(running) {
                        running = this.step()
                    }
                    let end = new Date().valueOf()
                    console.log(`Took ${end - start} ms`)
                }, 100)
            } else {
                this.run(0)
            }
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
            this.routeStart.stepOut(this.ctx, this.finish, true, this.gridMap),
            this.routeFinish.stepOut(this.ctx, this.start, true, this.gridMap),
            this.routeStart.stepOut(this.ctx, this.finish, false, this.gridMap),
            this.routeFinish.stepOut(this.ctx, this.start, false, this.gridMap),
        ].filter(route => route)

        if(possible_routes.length) {
            let route = possible_routes.sort((a, b) => a.getCost(this.gridMap) - b.getCost(this.gridMap))[0]
            if(route.left) {
                route.display(this.gridMap, this.ctx)
            } else {
                console.log("No route found")
            }
            if(this.runInterval) {
                clearTimeout(this.runInterval)
                this.runInterval = null
            }
            console.log("done")
            let tr = document.createElement("tr")
            let td = document.createElement("td")
            td.textContent = this.testNumber === null ?
                "Random test" :
                `Test ${this.testNumber}`
            tr.appendChild(td)
            td = document.createElement("td")
            td.textContent = route.getCost(this.gridMap) === Infinity ? "miss" : "" + route.getCost(this.gridMap)
            tr.appendChild(td)
            td = document.createElement("td")
            td.textContent = this.testNumber === null ?
                "N/A" :
                "" + this.currentTest.correctLength
            tr.appendChild(td)

            if(this.currentTest && this.currentTest.correctLength != route.getCost(this.gridMap)) {
                tr.style.color = "red"
            }
            document.querySelector("#test-results").appendChild(
                tr
            )
            if(this.resolvePromise) {
                this.resolvePromise()
            }
            return false
        } else {
            this.routeStart.linkRoutes(this.gridMap, this.ctx, this.blind, 4)
            this.routeFinish.linkRoutes(this.gridMap, this.ctx, this.blind, 4)
            this.routeStart.linkRoutes(this.gridMap, this.ctx, this.blind, 6)
            this.routeFinish.linkRoutes(this.gridMap, this.ctx, this.blind, 6)
            this.routeStart.stepRoutes(this.gridMap, this.ctx, this.blind)
            this.routeFinish.stepRoutes(this.gridMap, this.ctx, this.blind)
            return true
        }
    }
}