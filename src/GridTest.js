"use strict"
class GridTest {
    /**
     * @type {?{x: number, y: number}}
     */
    #finishPosition

    /**
     * @type {?GridMap}
     */
    #gridMap

    /**
     * @type {?RouteStepper}
     */
    #routeFinish

    /**
     * @type {?RouteStepper}
     */
    #routeStart

    /**
     * @type {?{x: number, y: number}}
     */
    #startPosition

    /**
     * This updates the map start/finish positions and handles display if needed
     */
    #updateMapInit() {
        if(this.gridMap) {
            if(this.finishPosition && !this.gridMap.finish) {
                this.gridMap.finish = this.finishPosition
                if(this.ctx) {
                    const node = new PositionedNode(OBSTRUCTION_NODE)
                    node.display(this.gridMap, this.finishPosition, this.ctx, "blue")
                }
            }
            if(this.startPosition && !this.gridMap.start) {
                this.gridMap.start = this.startPosition
                if(this.ctx) {
                    const node = new PositionedNode(OBSTRUCTION_NODE)
                    node.display(this.gridMap, this.startPosition, this.ctx, "green")
                }
            }
        }
    }

    get finishPosition() {
        return this.#finishPosition
    }
    set finishPosition(v) {
        this.#finishPosition = v
        if(this.gridMap) {
            this.gridMap.finish = null
        }
        if(v) {
            this.#routeFinish = new RouteStepper(2, v)
            this.#updateMapInit()
        } else {
            this.#routeFinish = null
        }
    }

    get startPosition() {
        return this.#startPosition
    }
    set startPosition(v) {
        this.#startPosition = v
        if(this.gridMap) {
            this.gridMap.start = null
        }
        if(v) {
            this.#routeStart = new RouteStepper(1, v)
            this.#updateMapInit()
        } else {
            this.#routeStart = null
        }
    }

    get gridMap() {
        return this.#gridMap
    }
    set gridMap(v) {
        this.#gridMap = v
        this.#updateMapInit()
    }

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
        this.currentTest = null
        this.nodeWidth = null

        this.obstructions = []
        this.startPosition = null
        this.finishPosition = null

        this._testNumber = null
    }
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
        if (input instanceof HTMLInputElement) {
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
        if (c instanceof HTMLCanvasElement) {
            c.width = c.clientWidth * window.devicePixelRatio
            c.height = c.clientHeight * window.devicePixelRatio
            if (!pixel_width)
                pixel_width = c.width
            const ctx = c.getContext("2d")
            if (!ctx)
                throw new Error("canvas context is null")
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
        if (!this.lastRoute) {
            throw new Error("No route described")
        }
        if (!this.gridMap)
            throw new Error("grid map is null")
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
        td.textContent = this.currentTest ?
            "" + this.currentTest.correctLength :
            "N/A"

        tr.appendChild(td)

        if (this.currentTest && this.currentTest.correctLength != this.lastRoute.getCost(this.gridMap)) {
            tr.style.color = "red"
        }
        const testResultsElement = document.querySelector("#test-results")
        if (testResultsElement) {
            testResultsElement.appendChild(tr)
        }
    }
    /**
     *
     * @param {number} [node_width]
     */
    async clear(node_width = 10) {
        this.currentTest = null
        this.nodeWidth = node_width

        const pixel_width = this.buildContext(this.nodeWidth)
        if (!this.ctx)
            throw new Error("canvas context is null")
        const grid_map = new GridMap(pixel_width, node_width)
        grid_map.display(this.ctx)

        this.obstructions = []

        this.gridMap = grid_map
        this.testNumber = null
    }
    /**
     *
     * @param {number} [node_width]
     */
    async initForRandomInstance(node_width = 10) {
        const grid_map = this.gridMap
        if (!grid_map) {
            throw new Error("Must clear first")
        }
        if (!this.ctx)
            throw new Error("canvas context is null")

        /**
         * @type {testSignature}
         */
        const test = new TestBuilder(grid_map)
        this.testNumber = null

        this.postInitForTest(test, grid_map)
    }
    /**
     *
     * @param {testSignature} test
     */
    initForTest(test) {
        this.nodeWidth = test.size || 10
        const pixel_width = this.buildContext(this.nodeWidth)
        const grid_map = new GridMap(pixel_width, this.nodeWidth)
        if (!this.ctx)
            throw new Error("canvas context is null")
        grid_map.display(this.ctx)
        this.gridMap = grid_map

        this.currentTest = test
        this.postInitForTest(test, grid_map)
    }
    /**
     *
     * @param {testSignature} test
     * @param {GridMap} grid_map
     */
    postInitForTest(test, grid_map) {
        this.nodeWidth = test.size || 10
        if (!this.ctx)
            throw new Error("canvas context is null")

        this.startPosition = test.start
        this.finishPosition = test.finish

        for (const o of test.obstructions) {
            grid_map.obstruct(o)
            const node = grid_map.nodeAt(o.x, o.y)
            if (!node)
                throw new Error("node is null??")
            node.display(grid_map, o, this.ctx, "red")
        }
        this.obstructions = test.obstructions

        this.testNumber = null
    }
    nextTest() {
        this.initForTest(this.tests[this.nextTestNumber])
        this.testNumber = this.nextTestNumber
        if (!this.paused) {
            this.run()
        }
        this.nextTestNumber = (this.nextTestNumber + 1) % this.tests.length
    }
    /**
     *
     * @param {number} [times]
     * @param {number} [s]
     */
    async randomTest(times = 10, s = 10) {
        await this.clear(s)
        for (let i = 0; i < times; i++) {
            await this.gridMap?.replaceNonObstruction()
            await this.initForRandomInstance(s)
            this.testNumber = null
            if (!this.paused) {
                if (this.blind) {
                    const start = new Date().valueOf()
                    await this.run(0)
                    const end = new Date().valueOf()
                    console.log(`Took ${end - start} ms`)
                } else {
                    await this.run()
                }
            }
        }
        if(this.gridMap && this.ctx) {
            this.gridMap.wipeNonObstruction(this.ctx, "black")
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
        const maxTries = 1000
        let tries
        if (interval_ms) {
            let t = new Date().valueOf()
            let steps = 0
            let calibrated_steps = 0
            let inner_ms = 0
            tries = 0
            while (running) {
                tries++
                if(tries > maxTries) {
                    throw new Error("Max tries exceeded")
                }
                running = this.step()
                steps++
                if (steps < calibrated_steps)
                    continue
                const tp = new Date().valueOf()
                if (tp - t >= interval_ms) {
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
            tries = 0
            while (running) {
                tries++
                if(tries > maxTries) {
                    throw new Error("Max tries exceeded")
                }
                running = this.step()
            }
            this.innerRuntime = new Date().valueOf() - t
        }
        this.displayResults()
    }
    async runAll() {
        for (const [i, test] of Object.entries(this.tests)) {
            this.initForTest(test)
            this.testNumber = +i
            await this.run(10)
        }
    }
    selectTest(n) {
        this.initForTest(this.tests[n])
        this.testNumber = n
        if (!this.paused) {
            this.run()
        }
    }
    step() {
        if (!this.#routeStart)
            throw new Error("No route start??")
        if (!this.#routeFinish)
            throw new Error("No route finish??")
        if (!this.startPosition)
            throw new Error("No route start position??")
        if (!this.finishPosition)
            throw new Error("No route finish position??")
        if (!this.gridMap)
            throw new Error("No grid map??")
        if (!this.ctx)
            throw new Error("canvas context is null")
        const grid_map = this.gridMap
        /**
         * @type {Route[]}
         */
        //@ts-ignore
        const possible_routes = [
            this.#routeStart.stepOut(this.finishPosition, true, this.gridMap),
            this.#routeFinish.stepOut(this.startPosition, true, this.gridMap),
            this.#routeStart.stepOut(this.finishPosition, false, this.gridMap),
            this.#routeFinish.stepOut(this.startPosition, false, this.gridMap),
        ].filter(route => route)

        if (possible_routes.length) {
            const route = possible_routes.sort((a, b) => a.getCost(grid_map) - b.getCost(grid_map))[0]
            if (route.left) {
                route.display(this.gridMap, this.ctx)
                route.burn(this.gridMap)
            } else {
                console.log("No route found")
            }
            this.lastRoute = route
            console.log("done")
            return false
        } else {
            const costs = [4, 6]
            const routes = [this.#routeStart, this.#routeFinish]
            for (const cost of costs) {
                for (const route of routes) {
                    route.linkRoutes(this.gridMap, this.ctx, this.blind, cost)
                }
            }
            for (const route of routes) {
                route.stepRoutes(this.gridMap, this.ctx, this.blind)
            }
            return true
        }
    }
}
