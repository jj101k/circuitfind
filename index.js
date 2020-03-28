"use strict"

const FOUR_BITS = 0b1111
const EMPTY_NODE = 0b0000
const OBSTRUCTION_NODE = 0b1111
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
     * @param {number} pixel_width
     * @param {number} node_width
     */
    constructor(pixel_width, node_width) {
        this.finish = {x: 0, y: 0}
        this.nodeWidth = node_width
        this.source = GridMapSource.build(node_width)
        this.start = {x: 0, y: 0}
        this.pixelWidth = pixel_width
    }
    get cw() {
        return this.pixelWidth / this.nodeWidth
    }
    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     */
    display(ctx) {
        ctx.fillStyle = this.cw > 10 ? "white" : "#888"
        ctx.fillRect(0, 0, this.nodeWidth, this.nodeWidth)
        ctx.beginPath()
        ctx.strokeStyle = "black"
        if(this.cw >= 3) {
            for(let x = 0; x <= this.nodeWidth; x++) {
                ctx.moveTo(x, 0)
                ctx.lineTo(x, this.nodeWidth)
            }
            for(let y = 0; y <= this.nodeWidth; y++) {
                ctx.moveTo(0, y)
                ctx.lineTo(this.nodeWidth, y)
            }
            ctx.lineWidth = 2 / this.cw
            ctx.stroke()
        }
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {?PositionedNode}
     */
    nodeAt(x, y) {
        const content = this.source.contentAt(x, y)
        switch(content) {
            case EMPTY_NODE:
                return null
            case OBSTRUCTION_NODE:
                return new PositionedNode(content)
            default:
                return new PathNode(content)
        }
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @returns {?boolean}
     */
    validAddress(x, y) {
        return x >= 0 && y >= 0 && x < this.nodeWidth && y < this.nodeWidth
    }
}

class PositionedNode {
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

        this.biggestRouteCount = 0
    }
    get zeroPositions() {
        return this.routes[0]
    }
    /**
     *
     * @param {{x: number, y: number}} target_position
     * @param {boolean} cheap
     * @param {GridMap} grid_map
     * @returns {?Route}
     */
    stepOut(target_position, cheap, grid_map) {
        /** @type {?Route} */
        let route = null
        let last_route_length = 0

        const step_type = cheap ? "cheap" : "expensive"
        const cost = cheap ? 4 : 6
        for(const position of this.zeroPositions) {
            for(const step of GeneralNode.nextSteps(position, step_type)) {
                if(grid_map.validAddress(step.x, step.y)) {
                    const existing_content = grid_map.source.contentAt(step.x, step.y)
                    if(existing_content == EMPTY_NODE) {
                        this.addNewRoute(cost, {from: position, to: step})
                    } else if(
                        (
                            // Directly reach the target (it happens)
                            step.x == target_position.x &&
                            step.y == target_position.y
                        ) || (
                            // Reach one of the target's path nodes
                            PathNode.isPath(existing_content) &&
                            grid_map.source.isLeafNode(step) &&
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
        } else if(this.hasRoutes()) {
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
        for(const r of this.newRoutesFor(cost)) {
            const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
            if(grid_map.source.addNode(content, r.to) && !blind) {
                PathNode.displayAt(content, grid_map, r.to, ctx, this.side)
            }
        }
    }
    /**
     *
     * @param {number} n
     * @param {{from: {x: number, y: number}, to: {x: number, y: number}}} r
     */
    addNewRoute(n, r) {
        this.newRoutes[n].push(r)
    }
    hasRoutes() {
        return(
            Object.values(this.newRoutes).some(r => r.length) ||
            Object.values(this.routes).some(r => r.length)
        )
    }
    /**
     *
     * @param {number} n
     */
    newRoutesFor(n) {
        return this.newRoutes[n]
    }
    /**
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
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
                return grid_map.source.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
            4: this.routes[6].concat(this.newRoutes[6].filter(r => {
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
                return grid_map.source.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
            6: [],
        }
        this.newRoutes = {
            4: [],
            6: [],
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} blind
     */
    stepRoutes(grid_map, ctx, blind) {
        if(!blind) {
            for(const position of this.zeroPositions) {
                const path = grid_map.nodeAt(position.x, position.y)
                if(path instanceof PathNode) {
                    path.display(grid_map, position, ctx, "black")
                }
            }
        }
        this.stepRoutesInner(grid_map)
    }
}

class PathNode extends PositionedNode {
    /**
     *
     * @param {number} content
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} side
     */
    static displayAt(content, grid_map, position, ctx, side) {
        const p = new PathNode(content)
        p.display(grid_map, position, ctx, "light" + (side & 1 ? "blue" : "green"))
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {{x: number, y: number}} from_position
     * @param {number} side
     */
    static encodeFromDirection(x, y, from_position, side) {
        const dx = x - from_position.x
        const dy = y - from_position.y
        let direction
        if(Math.abs(dx) - Math.abs(dy) == 0) {
            // diagonal
            direction = (4 + Math.abs(dx) + dx + (Math.abs(dy) + dy)/2)
        } else {
            // straight
            direction = (Math.abs(dx) + dx + dy + 1)
        }
        if(side == 2 && direction < 6) {
            return direction + 0b1000 + 1
        } else {
            return direction + 1
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
        const from_direction = (from_content - 1) & 0b111
        let dx
        let dy
        if(from_direction >= 4) { // [4..15] <- [5..15, 16(*)]
            dx = 1 - (from_direction & 2)
            dy = 1 - (from_direction % 2) * 2
        } else if(from_direction % 2) { // [1, 3] <- [2, 4]
            dx = 2 - from_direction
            dy = 0
        } else { // [0, 2] <- [1, 3]
            dx = 0
            dy = 1 - from_direction
        }
        return {x: x + dx, y: y + dy}
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
            c = grid_map.source.contentAt(position.x, position.y)
        ) {
            if(c < 0b0111) {
                return 1
            } else if(c > 0b1000) {
                return 2
            }
        }
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
        return content != EMPTY_NODE && content != OBSTRUCTION_NODE
    }
    get fromDirection() {
        switch((this.content - 1) & 0b111) {
            case 0: return "\u2193"
            case 1: return "\u2192"
            case 2: return "\u2191"
            case 3: return "\u2190"
            case 4: return "\u2198"
            case 5: return "\u2197"
            case 6: return "\u2199"
            case 7: return "\u2196"
            default: return "?"
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
            const m = grid_map.source.contentAt(n.x, n.y)
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
        let ac = grid_map.source.contentAt(a.x, a.y)
        while(PathNode.isPath(ac)) {
            nodes.push(a)
            a = PathNode.getFromPosition(a.x, a.y, ac)
            ac = grid_map.source.contentAt(a.x, a.y)
        }
        let bc = grid_map.source.contentAt(b.x, b.y)
        while(PathNode.isPath(bc)) {
            nodes.unshift(b)
            b = PathNode.getFromPosition(b.x, b.y, bc)
            bc = grid_map.source.contentAt(b.x, b.y)
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
        /**
         * @type {?number}
         */
        this.innerRuntime = null
        /** @type {?Route} */
        this.lastRoute = null
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
        this.randomCornerToCorner = true
        this.currentTest = null
        this.nodeWidth = null

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
            size: this.nodeWidth,
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
    /**
     * Returns a new canvas 2D context scaled as appropriate
     *
     * @param {number} node_width The number of nodes per side
     * @param {?number} pixel_width The number of pixels per side the canvas can
     * neatly display
     * @returns {number} The number of pixels per side the canvas can neatly
     * display
     */
    buildContext(node_width, pixel_width = null) {
        const c = document.getElementById("grid")
        if(c instanceof HTMLCanvasElement) {
            c.width = c.clientWidth * window.devicePixelRatio
            c.height = c.clientHeight * window.devicePixelRatio
            if(!pixel_width) pixel_width = c.width
            const ctx = c.getContext("2d")
            ctx.restore()
            ctx.save()
            ctx.scale(pixel_width / node_width, pixel_width / node_width)
            this.ctx = ctx
            return pixel_width
        } else {
            throw new Error("Well, that's the wrong element type")
        }
    }
    displayResults() {
        if(!this.lastRoute) {
            throw new Error("No route described")
        }
        const tr = document.createElement("tr")
        let td = document.createElement("td")
        td.textContent = this.testNumber === null ?
            "Random test" :
            `Test ${this.testNumber}`
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = this.lastRoute.getCost(this.gridMap) === Infinity ?
            "miss" :
            "" + this.lastRoute.getCost(this.gridMap)
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = "" + this.innerRuntime
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = this.testNumber === null ?
            "N/A" :
            "" + this.currentTest.correctLength
        tr.appendChild(td)

        if(this.currentTest && this.currentTest.correctLength != this.lastRoute.getCost(this.gridMap)) {
            tr.style.color = "red"
        }
        document.querySelector("#test-results").appendChild(
            tr
        )
    }
    /**
     *
     * @param {number} [node_width]
     */
    initForNull(node_width = 10) {
        this.currentTest = null
        this.nodeWidth = node_width

        this.startPosition = {
            x: 0,
            y: 0,
        }
        this.start = new PositionedNode(OBSTRUCTION_NODE)
        this.routeStart = new RouteStepper(1, this.startPosition)
        this.finishPosition = {
            x: node_width - 1,
            y: node_width - 1,
        }
        this.finish = new PositionedNode(OBSTRUCTION_NODE)
        this.routeFinish = new RouteStepper(2, this.finishPosition)

        const pixel_width = this.buildContext(this.nodeWidth)
        const grid_map = new GridMap(pixel_width, this.nodeWidth)
        grid_map.display(this.ctx)

        grid_map.source.addNode(this.start.content, this.startPosition, true)
        grid_map.start = this.startPosition
        grid_map.source.addNode(this.finish.content, this.finishPosition, true)
        grid_map.finish = this.finishPosition
        this.obstructions = []

        this.gridMap = grid_map
        this.start.display(grid_map, this.startPosition, this.ctx, "green")
        this.finish.display(grid_map, this.finishPosition, this.ctx, "blue")

        this.testNumber = null
    }
    /**
     *
     * @param {number} [node_width]
     */
    async initForRandom(node_width = 10) {
        this.currentTest = null
        /** @type {{x: number, y: number}[]} */
        let obstructions = []
        this.nodeWidth = node_width

        const pixel_width = this.buildContext(this.nodeWidth)
        const grid_map = new GridMap(pixel_width, node_width)
        grid_map.display(this.ctx)

        let t = new Date().valueOf()
        for(let y = 0; y < node_width; y++) {
            for(let x = 0; x < node_width; x++) {
                if(Math.random() > 0.5) {
                    const o = {x: x, y: y}
                    obstructions.push(o)
                    grid_map.source.addNode(OBSTRUCTION_NODE, o, true)
                    grid_map.nodeAt(o.x, o.y).display(grid_map, o, this.ctx, "red")
                }
            }
            const tp = new Date().valueOf()
            if(tp > t + 10) {
                await new Promise(resolve => setTimeout(resolve, 0))
                t = new Date().valueOf()
            }
        }

        if(this.randomCornerToCorner) {
            // If in the actual corner, your chance of being blocked initially
            // is P^3, eg. 1/8; if offset by one it's P^8 (practically P^5), eg.
            // 1/32; if offset by two it's P^8, eg. 1/256.
            this.startPosition = {
                x: 2,
                y: 2,
            }
        } else {
            this.startPosition = {
                x: Math.floor(Math.random() * node_width),
                y: Math.floor(Math.random() * node_width),
            }
        }
        this.start = new PositionedNode(OBSTRUCTION_NODE)
        this.routeStart = new RouteStepper(1, this.startPosition)
        if(this.randomCornerToCorner) {
            // See note on start position
            this.finishPosition = {
                x: node_width - 3,
                y: node_width - 3,
            }
        } else {
            do {
                this.finishPosition = {
                    x: Math.floor(Math.random() * node_width),
                    y: Math.floor(Math.random() * node_width),
                }
            } while(
                this.finishPosition.x == this.startPosition.x &&
                this.finishPosition.y == this.startPosition.y
            )
        }
        this.finish = new PositionedNode(OBSTRUCTION_NODE)
        this.routeFinish = new RouteStepper(2, this.finishPosition)

        grid_map.source.addNode(this.start.content, this.startPosition, true)
        grid_map.start = this.startPosition
        grid_map.source.addNode(this.finish.content, this.finishPosition, true)
        grid_map.finish = this.finishPosition

        this.obstructions = obstructions

        this.gridMap = grid_map
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
        this.start = new PositionedNode(OBSTRUCTION_NODE)
        this.startPosition = test.start
        this.routeStart = new RouteStepper(1, test.start)
        this.finish = new PositionedNode(OBSTRUCTION_NODE)
        this.finishPosition = test.finish
        this.routeFinish = new RouteStepper(2, test.finish)
        let obstructions = test.obstructions
        this.nodeWidth = test.size || 10
        const pixel_width = this.buildContext(this.nodeWidth)
        const grid_map = new GridMap(pixel_width, this.nodeWidth)
        grid_map.display(this.ctx)

        for(const o of obstructions) {
            grid_map.source.addNode(OBSTRUCTION_NODE, o, true)
        }
        grid_map.source.addNode(this.start.content, test.start, true)
        grid_map.start = test.start
        grid_map.source.addNode(this.finish.content, test.finish, true)
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
                await this.run(0)
                const end = new Date().valueOf()
                console.log(`Took ${end - start} ms`)
            } else {
                await this.run()
            }
        }
    }
    /**
     *
     * @param {number} [s]
     */
    async randomTest(s = 10) {
        await this.initForRandom(s)
        this.testNumber = null
        if(!this.paused) {
            if(this.blind) {
                const start = new Date().valueOf()
                await this.run(0)
                const end = new Date().valueOf()
                console.log(`Took ${end - start} ms`)
            } else {
                await this.run()
            }
        }
    }
    /**
     * Runs the test. Where interval_ms is nonzero, that's the usual wait
     * between frame updates (default 10ms). You can think of this as operating
     * in a "vsync" mode.
     *
     * @param {number} interval_ms
     */
    async run(interval_ms = 10) {
        this.innerRuntime = null
        let running = true
        if(interval_ms) {
            let t = new Date().valueOf()
            let steps = 0
            let calibrated_steps = 0
            let inner_ms = 0
            while(running) {
                running = this.step()
                steps++
                if(steps < calibrated_steps) continue
                const tp = new Date().valueOf()
                if(tp - t >= interval_ms) {
                    calibrated_steps = steps * 0.75
                    inner_ms += tp - t
                    await new Promise(
                        resolve => setTimeout(
                            resolve,
                            0
                        )
                    )
                    steps = 0
                    t = new Date().valueOf()
                }
            }
            this.innerRuntime = inner_ms + new Date().valueOf() - t
        } else {
            const t = new Date().valueOf()
            while(running) {
                running = this.step()
            }
            this.innerRuntime = new Date().valueOf() - t
        }
        this.displayResults()
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
            this.routeStart.stepOut(this.finishPosition, true, this.gridMap),
            this.routeFinish.stepOut(this.startPosition, true, this.gridMap),
            this.routeStart.stepOut(this.finishPosition, false, this.gridMap),
            this.routeFinish.stepOut(this.startPosition, false, this.gridMap),
        ].filter(route => route)

        if(possible_routes.length) {
            const route = possible_routes.sort((a, b) => a.getCost(this.gridMap) - b.getCost(this.gridMap))[0]
            if(route.left) {
                route.display(this.gridMap, this.ctx)
            } else {
                console.log("No route found")
            }
            this.lastRoute = route
            console.log("done")
            return false
        } else {
            const costs = [4, 6]
            const routes = [this.routeStart, this.routeFinish]
            for(const cost of costs) {
                for(const route of routes) {
                    route.linkRoutes(this.gridMap, this.ctx, this.blind, cost)
                }
            }
            for(const route of routes) {
                route.stepRoutes(this.gridMap, this.ctx, this.blind)
            }
            return true
        }
    }
}

/** @type {HTMLInputElement} */
const e = document.querySelector("#wasm-import")
e.onchange = async function() {
    if(e.files) {
        const fr = new FileReader()
        fr.onload = () => {
            const m = new WebAssembly.Instance(new WebAssembly.Module(fr.result), {
                console: {
                    /**
                     * For debugging. Wraps actual console.log.
                     *
                     * @param {number} n
                     */
                    log(n) {
                        console.log(n)
                    },
                },
            })
            const h = new Int32Array(m.exports.memory.buffer)
            GeneralNode.nextSteps =
            /**
             *
             * @param {{x: number, y: number}} position
             * @param {"cheap" | "expensive"} step_type
             * @returns {{x: number, y: number}[]}
             */
            (position, step_type) => {
                const p = m.exports.nextSteps(position.x, position.y, +(step_type == "expensive"))
                return [
                    {x: h[p + 0], y: h[p + 1]},
                    {x: h[p + 2], y: h[p + 3]},
                    {x: h[p + 4], y: h[p + 5]},
                    {x: h[p + 6], y: h[p + 7]},
                ]
            }
            PathNode.getFromPosition = (x, y, content) => {
                const offset = m.exports.getFromPosition(x, y, content)
                return {
                    x: h[offset / 4 + 1],
                    y: h[offset / 4 + 0],
                }
            }
            PathNode.isPath = content => !!m.exports.isPath(content)
            GridMapSource.build = (node_width) => {
                m.exports.init(node_width)
                return {
                    addNode(content, position, overwrite) {
                        return !!m.exports.addNode(content, position.x, position.y, overwrite)
                    },
                    contentAt: m.exports.contentAt,
                    isLeafNode(position) {
                        return !!m.exports.isLeafNode(position.x, position.y)
                    },
                    nodes: [],
                    nodeWidth: node_width,
                }
            }
        }
        fr.readAsArrayBuffer(e.files[0])
    }
}