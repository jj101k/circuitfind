"use strict"

const FOUR_BITS = 0b1111
const EMPTY_NODE = 0b0000
const OBSTRUCTION_NODE = 0b0111

class GridMap {
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x: number, y: number}} position
     * @param {function(): void} action
     */
    static displayNode(ctx, position, action) {
        ctx.save()
        ctx.translate(position.x, position.y)
        action()
        ctx.restore()
    }
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

        this.finish = {x: 0, y: 0}
        this.start = {x: 0, y: 0}
    }
    get cw() {
        return this.w / this.l
    }
    /**
     *
     * @param {number} content
     * @param {{x: number, y: number}} position
     * @param {boolean} overwrite
     * @returns {boolean}
     */
    addNode(content, position, overwrite = false) {
        const address = position.x + position.y * this.l
        const offset = Math.floor(address / 2)
        const bottom = address % 2
        const existing_node = bottom ?
            (this.nodes[offset] & FOUR_BITS) :
            (this.nodes[offset] >> 4)
        if(overwrite || !existing_node) {
            if(bottom) {
                this.nodes[offset] =
                    (this.nodes[offset] & (FOUR_BITS << 4)) + (content & FOUR_BITS)
            } else {
                this.nodes[offset] =
                    ((content & FOUR_BITS) << 4) + (this.nodes[offset] & FOUR_BITS)
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
        const address = x + y * this.l
        const offset = address >> 1
        const bottom = address & 1
        return bottom ?
            (this.nodes[offset] & FOUR_BITS) :
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
     * True if `position` is a leaf node, ie a non-target.
     *
     * @param {{x: number, y: number}} position
     * @returns {boolean}
     */
    isLeafNode(position) {
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x || y) {
                    const c = this.contentAt(position.x + x, position.y + y)
                    if(PathNode.isPath(c)) {
                        const pos = PathNode.getFromPosition(
                            position.x + x,
                            position.y + y,
                            c
                        )
                        if(pos.x == position.x && pos.y == position.y) return false
                    }
                }
            }
        }
        return true
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {?PositionedNode}
     */
    nodeAt(x, y) {
        return PositionedNode.nodeFor(
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
     * @param {{x: number, y: number}} position
     * @param {"cheap" | "expensive"} step_type
     */
    static nextSteps(position, step_type) {
        /** @type {{x: number, y: number}[]} */
        const steps = []
        if(step_type == "cheap") {
            [-1, 1].forEach(o => {
                steps.push({x: o + position.x, y: position.y})
                steps.push({x: position.x, y: o + position.y})
            })
        } else {
            [-1, 1].forEach(x => {
                [-1, 1].forEach(y => {
                    steps.push({x: x + position.x, y: y + position.y})
                })
            })
        }
        return steps
    }
    /**
     *
     * @param {number} content 0-15
     * @returns {?PositionedNode}
     */
    static nodeFor(content) {
        switch(content) {
            case EMPTY_NODE:
                return null
            case OBSTRUCTION_NODE:
                return new PositionedNode(content)
            default:
                if(PathNode.isPath(content)) {
                    return new PathNode(content)
                } else {
                    return new PositionedNode(content)
                }
        }
    }
    /**
     *
     * @param {number} content 0-15
     */
    constructor(content) {
        this.content = content
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} colour
     */
    display(grid_map, position, ctx, colour) {
        GridMap.displayNode(ctx, position, () => {
            ctx.fillStyle = colour
            ctx.fillRect(0.125, 0.125, 0.75, 0.75)
        })
    }
}

class RouteStepper {
    /**
     *
     * @param {number} side
     * @param {{x: number, y: number}} position
     */
    constructor(side, position) {
        this.side = side
        /** @type {{[cost: number]: {from: {x: number, y: number}, to: {x: number, y: number}}[]}} */
        this.newRoutes = {
            4: [],
            6: [],
        }
        /** @type {{[cost: number]: {x: number, y: number}[]}} */
        this.routes = {
            0: [position],
            2: [],
            4: [],
            6: [],
        }
    }
    /**
     *
     * @param {PositionedNode} target
     * @param {boolean} cheap
     * @param {GridMap} grid_map
     * @param {RouteStepper} other_stepper
     * @returns {?Route}
     */
    stepOut(target, cheap, grid_map, other_stepper) {
        /** @type {?Route} */
        let route = null
        let last_route_length = 0

        const step_type = cheap ? "cheap" : "expensive"
        /** @type {?number[]} */
        let leaf_uids = null
        const get_leaf_uids = () => {
            if(!leaf_uids) {
                leaf_uids = Object.keys(this.routes).reduce(
                    (carry, item) => carry.concat(this.routes[item].map(p => p.x + grid_map.l * p.y)),
                    []
                )
            }
            return leaf_uids
        }
        for(const position of this.routes[0]) {
            for(const step of PositionedNode.nextSteps(position, step_type)) {
                if(grid_map.validAddress(step.x, step.y)) {
                    const existing_content = grid_map.contentAt(step.x, step.y)
                    const step_uid = step.x + grid_map.l * step.y
                    if(existing_content == EMPTY_NODE) {
                        const cost = Math.abs(step.x - position.x) + Math.abs(step.y - position.y) > 1 ? 6 : 4
                        this.newRoutes[cost].push({from: position, to: step})
                    } else if(
                        (
                            // Directly reach the target (it happens)
                            existing_content == target.content
                        ) || (
                            // Reach one of the target's path nodes
                            PathNode.isPath(existing_content) &&
                            !get_leaf_uids().some(uid => uid == step_uid) &&
                            grid_map.isLeafNode(step) &&
                            PathNode.getOwner(existing_content, grid_map, step) != this.side
                        )
                    ) {
                        const r = new Route(position, step)
                        const route_cost = r.getCost(grid_map)
                        if(!route) {
                            route = r
                            last_route_length = route_cost
                        } else if(last_route_length > route_cost) {
                            route = r
                            last_route_length = route_cost
                        }
                    }
                }
            }
        }
        if(route) {
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
        this.newRoutes[cost].forEach(r => {
            const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from)
            if(grid_map.addNode(content, r.to) && !blind) {
                const p = new PathNode(content)
                p.display(grid_map, r.to, ctx, "light" + (this.side & 1 ? "blue" : "green"))
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
        if(!blind) {
            this.routes[0].forEach(position => {
                const path = grid_map.nodeAt(position.x, position.y)
                if(path instanceof PathNode) path.display(grid_map, position, ctx, "black")
            })
        }
        this.routes = {
            0: this.routes[2],
            2: this.routes[4].concat(this.newRoutes[4].filter(r => {
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from)
                return grid_map.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
            4: this.routes[6].concat(this.newRoutes[6].filter(r => {
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from)
                return grid_map.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
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
     * @param {{x: number, y: number}} from_position
     */
    static encodeFromDirection(x, y, from_position) {
        const dx = x - from_position.x
        const dy = y - from_position.y
        if(Math.abs(dx) - Math.abs(dy) == 0) {
            // diagonal
            return 0b1000 | (4 + Math.abs(dx) + dx + (Math.abs(dy) + dy)/2)
        } else {
            // straight
            return 0b1000 | (Math.abs(dx) + dx + dy + 1)
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
     * @param {number} from_content
     */
    static getFromPosition(x, y, from_content) {
        const from_direction = from_content & 0b111
        if(from_direction >= 4) {
            const t = from_direction - 4
            const dx = (t & 2) - 1
            const dy = (t % 2) * 2 - 1
            return {x: x - dx, y: y - dy}
        } else {
            const t = from_direction - 1
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
     * @param {number} content
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @returns {number}
     */
    static getOwner(content, grid_map, position) {
        let c
        for(
            c = content;
            PathNode.isPath(c);
            position = PathNode.getFromPosition(position.x, position.y, c),
            c = grid_map.contentAt(position.x, position.y)
        ) ;
        if(position.x == grid_map.start.x && position.y == grid_map.start.y) {
            return 1
        } else {
            return 2
        }
    }
    /**
     *
     * @param {number} content
     * @returns {boolean}
     */
    static isPath(content) {
        return !!(content & 0b1000)
    }
    /**
     *
     * @param {number} fromDirection 0-7 or 8+(0-7)
     */
    constructor(fromDirection) {
        super(0b1000 | fromDirection)
    }
    get fromDirection() {
        switch(this.content & 0b111) {
            case 0: return "\u2193"
            case 1: return "\u2192"
            case 2: return "\u2191"
            case 3: return "\u2190"
            case 4: return "\u2198"
            case 5: return "\u2197"
            case 6: return "\u2199"
            case 7: return "\u2196"
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} colour
     */
    display(grid_map, position, ctx, colour) {
        super.display(grid_map, position, ctx, colour)
        GridMap.displayNode(ctx, position, grid_map.cw > 10 ? () => {
            ctx.scale(0.1, 0.1)
            ctx.font = "7px Arial"
            ctx.fillStyle = "#888"
            const m = ctx.measureText(this.fromDirection)
            ctx.fillText(this.fromDirection, Math.ceil(4 - m.width / 2), 7)
        } : () => {})
    }
}

class Route {
    /**
     *
     * @param {?{x: number, y: number}} left
     * @param {?{x: number, y: number}} right
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
            const m = grid_map.nodeAt(n.x, n.y)
            if(n.x == this.left.x && n.y == this.left.y) {
                m.display(grid_map, n, ctx, "pink")
            } else if(n.x == this.right.x && n.y == this.right.y) {
                m.display(grid_map, n, ctx, "yellow")
            } else {
                m.display(grid_map, n, ctx, "orange")
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
        let cost = 0
        if(this.left.x == this.right.x || this.left.y == this.right.y) {
            cost += 4
        } else {
            cost += 6
        }
        this.getNodes(grid_map).forEach(n => {
            const m = grid_map.contentAt(n.x, n.y)
            const mf = PathNode.getFromPosition(n.x, n.y, m)
            if(mf.x == n.x || mf.y == n.y) {
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
     * @return {{x: number, y: number}[]}
     */
    getNodes(grid_map) {
        let [a, b] = [this.left, this.right]
        /** @type {{x: number, y: number}[]} */
        const nodes = []
        let ac = grid_map.contentAt(a.x, a.y)
        while(PathNode.isPath(ac)) {
            nodes.push(a)
            a = PathNode.getFromPosition(a.x, a.y, ac)
            ac = grid_map.contentAt(a.x, a.y)
        }
        let bc = grid_map.contentAt(b.x, b.y)
        while(PathNode.isPath(bc)) {
            nodes.unshift(b)
            b = PathNode.getFromPosition(b.x, b.y, bc)
            bc = grid_map.contentAt(b.x, b.y)
        }
        return nodes
    }
}

/**
 * @typedef testSignature
 * @property {?{x: number, y: number}} start
 * @property {?{x: number, y: number}} finish
 * @property {{x: number, y: number}[]} obstructions
 * @property {?boolean} passed
 * @property {?number} correctLength
 * @property {?number} size
 */

class GridTest {
    constructor() {
        this.blind = false
        /** @type {?GridMap} */
        this.gridMap = null
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
        this.currentTest = null
        this.size = null

        this.obstructions = null
        this.startPosition = null
        this.finishPosition = null
    }
    /** @type {testSignature} */
    get generatedState() {
        return {
            start: this.startPosition,
            finish: this.finishPosition,
            obstructions: this.obstructions,
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
        const input = document.querySelector("input#test-number")
        if(input instanceof HTMLInputElement) {
            input.value = (v === null) ? "" : ("" + v)
        }
    }
    dumpGeneratedState() {
        console.log(JSON.stringify(this.generatedState))
    }
    buildContext(w = null, l = 10) {
        const c = document.getElementById("grid")
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
    initForNull(s = 10) {
        this.currentTest = null
        this.size = s

        this.startPosition = {
            x: 0,
            y: 0,
        }
        this.start = new PositionedNode(1)
        this.routeStart = new RouteStepper(1, this.startPosition)
        this.finishPosition = {
            x: s - 1,
            y: s - 1,
        }
        this.finish = new PositionedNode(2)
        this.routeFinish = new RouteStepper(2, this.finishPosition)

        const w = this.buildContext(null, s)
        const grid_map = new GridMap(w, s)
        grid_map.display(this.ctx)

        grid_map.addNode(this.start.content, this.startPosition, true)
        grid_map.start = this.startPosition
        grid_map.addNode(this.finish.content, this.finishPosition, true)
        grid_map.finish = this.finishPosition
        this.obstructions = []

        this.gridMap = grid_map
        this.start.display(grid_map, this.startPosition, this.ctx, "green")
        this.finish.display(grid_map, this.finishPosition, this.ctx, "blue")

        this.testNumber = null
    }
    /**
     *
     * @param {number} [s]
     */
    initForRandom(s = 10) {
        this.currentTest = null
        /** @type {{x: number, y: number}[]} */
        let obstructions = []
        this.size = s
        for(let x = 0; x < s; x++) {
            for(let y = 0; y < s; y++) {
                if(Math.random() > 0.5) {
                    obstructions.push({x: x, y: y})
                }
            }
        }

        this.startPosition = {
            x: Math.floor(Math.random() * s),
            y: Math.floor(Math.random() * s),
        }
        this.start = new PositionedNode(1)
        this.routeStart = new RouteStepper(1, this.startPosition)
        do {
            this.finishPosition = {
                x: Math.floor(Math.random() * s),
                y: Math.floor(Math.random() * s),
            }
        } while(
            this.finishPosition.x == this.startPosition.x &&
            this.finishPosition.y == this.startPosition.y
        )
        this.finish = new PositionedNode(2)
        this.routeFinish = new RouteStepper(2, this.finishPosition)

        const w = this.buildContext(null, s)
        const grid_map = new GridMap(w, s)
        grid_map.display(this.ctx)

        for(const o of obstructions) {
            grid_map.addNode(OBSTRUCTION_NODE, o, true)
        }
        grid_map.addNode(this.start.content, this.startPosition, true)
        grid_map.start = this.startPosition
        grid_map.addNode(this.finish.content, this.finishPosition, true)
        grid_map.finish = this.finishPosition

        this.obstructions = obstructions

        this.gridMap = grid_map
        for(const o of this.obstructions) {
            grid_map.nodeAt(o.x, o.y).display(grid_map, o, this.ctx, "red")
        }
        this.start.display(grid_map, this.startPosition, this.ctx, "green")
        this.finish.display(grid_map, this.finishPosition, this.ctx, "blue")

        this.testNumber = null
    }
    /**
     *
     * @param {testSignature} test
     */
    initForTest(test) {
        this.currentTest = test
        this.start = new PositionedNode(1)
        this.startPosition = test.start
        this.routeStart = new RouteStepper(1, test.start)
        this.finish = new PositionedNode(2)
        this.finishPosition = test.finish
        this.routeFinish = new RouteStepper(2, test.finish)
        let obstructions = test.obstructions
        this.size = test.size || 10
        const w = this.buildContext(null, this.size)
        const grid_map = new GridMap(w, this.size)
        grid_map.display(this.ctx)

        for(const o of obstructions) {
            grid_map.addNode(OBSTRUCTION_NODE, o, true)
        }
        grid_map.addNode(this.start.content, test.start, true)
        grid_map.start = test.start
        grid_map.addNode(this.finish.content, test.finish, true)
        grid_map.finish = test.finish

        this.gridMap = grid_map
        for(const o of obstructions) {
            grid_map.nodeAt(o.x, o.y).display(grid_map, o, this.ctx, "red")
        }
        this.obstructions = obstructions
        this.start.display(grid_map, test.start, this.ctx, "green")
        this.finish.display(grid_map, test.finish, this.ctx, "blue")
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
    async nullTest(s = 10) {
        this.initForNull(s)
        this.testNumber = null
        if(!this.paused) {
            if(this.blind) {
                const start = new Date().valueOf()
                let running = true
                while(running) {
                    running = this.step()
                }
                const end = new Date().valueOf()
                console.log(`Took ${end - start} ms`)
            } else {
                await this.run(0)
            }
        }
    }
    /**
     *
     * @param {number} [s]
     */
    async randomTest(s = 10) {
        this.initForRandom(s)
        this.testNumber = null
        if(!this.paused) {
            if(this.blind) {
                const start = new Date().valueOf()
                let running = true
                while(running) {
                    running = this.step()
                }
                const end = new Date().valueOf()
                console.log(`Took ${end - start} ms`)
            } else {
                await this.run(0)
            }
        }
    }
    async run(interval_ms = 100) {
        let running = true
        if(interval_ms) {
            while(running) {
                running = this.step()
                await new Promise(
                    resolve => setTimeout(resolve, interval_ms)
                )
            }
        } else {
            while(running) {
                running = this.step()
            }
        }
    }
    async runAll() {
        for(const [i, test] of Object.entries(this.tests)) {
            this.initForTest(test)
            this.testNumber = +i
            await this.run(10)
        }
    }
    selectTest(n) {
        this.initForTest(this.tests[n])
        this.testNumber = n
        if(!this.paused) {
            this.run()
        }
    }
    step() {
        const possible_routes = [
            this.routeStart.stepOut(this.finish, true, this.gridMap, this.routeFinish),
            this.routeFinish.stepOut(this.start, true, this.gridMap, this.routeStart),
            this.routeStart.stepOut(this.finish, false, this.gridMap, this.routeFinish),
            this.routeFinish.stepOut(this.start, false, this.gridMap, this.routeStart),
        ].filter(route => route)

        if(possible_routes.length) {
            const route = possible_routes.sort((a, b) => a.getCost(this.gridMap) - b.getCost(this.gridMap))[0]
            if(route.left) {
                route.display(this.gridMap, this.ctx)
            } else {
                console.log("No route found")
            }
            console.log("done")
            const tr = document.createElement("tr")
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