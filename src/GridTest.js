class GridTest {
    /**
     * @type {CanvasRenderingContext2D}
     */
    #ctx

    /**
     * @type {testSignature}
     */
    #currentTest

    /**
     * @type {position}
     */
    #finishPosition

    /**
     * @type {GridMap}
     */
    #gridMap

    /**
     * @type {?number}
     */
    #innerRuntime = null

    /**
     * @type {?Route}
     */
    #lastRoute = null

    /**
     * @type {number}
     */
    #nodeWidth

    /**
     * @type {position[]}
     */
    #obstructions = []

    /**
     * @type {RouteStepper}
     */
    #routeFinish

     /**
      * @type {RouteStepper}
      */
    #routeStart

    /**
     * @type {position}
     */
    #startPosition

    /**
     * @type {?number}
     */
    #testNumber

    /**
     * True if updates are going to be turned off
     */
    blind = false

    /**
     * Information about the test
     */
    get generatedState() {
        return {
            start: this.#startPosition,
            finish: this.#finishPosition,
            obstructions: this.#obstructions,
            passed: null,
            correctLength: null,
            size: this.#nodeWidth,
        }
    }

    /**
     * Information about how the test went
     */
    get results() {
        if (!this.#lastRoute) {
            throw new Error("No route described")
        }

        return {
            cost: this.#lastRoute.getCost(this.#gridMap),
            currentTest: this.#currentTest ? {
                correctLength: this.#currentTest?.correctLength,
            } : null,
            innerRuntime: this.#innerRuntime,
            testNumber: this.#testNumber,
        }
    }

    /**
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {GridMap} gridMap
     * @param {testSignature} test
     * @param {?number} [testNumber]
     */
    constructor(ctx, gridMap, test, testNumber = null) {
        this.#ctx = ctx
        this.#gridMap = gridMap
        this.#nodeWidth = test.size || 10

        this.#gridMap.start = this.#startPosition = test.start
        this.#routeStart = new RouteStepper(1, test.start)

        this.#gridMap.finish = this.#finishPosition = test.finish
        this.#routeFinish = new RouteStepper(2, test.finish)

        const node = new PositionedNode(OBSTRUCTION_NODE)
        node.display(this.#gridMap, this.#finishPosition, this.#ctx, "blue")
        node.display(this.#gridMap, this.#startPosition, this.#ctx, "green")

        for (const o of test.obstructions) {
            this.#gridMap.obstruct(o)
            const node = this.#gridMap.nodeAt(o.x, o.y)
            if (!node)
                throw new Error("node is null??")
            node.display(this.#gridMap, o, this.#ctx, "red")
        }
        this.obstructions = test.obstructions

        this.#testNumber = testNumber
    }

    /**
     * Runs the test. Where interval_ms is nonzero, that's the usual wait
     * between frame updates (default 10ms). You can think of this as operating
     * in a "vsync" mode.
     *
     * @param {number} interval_ms
     */
     async run(interval_ms = 10) {
        this.#innerRuntime = null
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
            this.#innerRuntime = inner_ms + new Date().valueOf() - t
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
            this.#innerRuntime = new Date().valueOf() - t
        }
    }

    step() {
        /**
         * @type {Route[]}
         */
        //@ts-ignore
        const possible_routes = [
            this.#routeStart.stepOut(this.#finishPosition, true, this.#gridMap),
            this.#routeFinish.stepOut(this.#startPosition, true, this.#gridMap),
            this.#routeStart.stepOut(this.#finishPosition, false, this.#gridMap),
            this.#routeFinish.stepOut(this.#startPosition, false, this.#gridMap),
        ].filter(route => route)

        if (possible_routes.length) {
            const route = possible_routes.sort((a, b) => a.getCost(this.#gridMap) - b.getCost(this.#gridMap))[0]
            if (route.left) {
                route.display(this.#gridMap, this.#ctx)
                route.burn(this.#gridMap)
            } else {
                console.log("No route found")
            }
            this.#lastRoute = route
            console.log("done", this.#lastRoute)
            return false
        } else {
            const costs = [4, 6]
            const routes = [this.#routeStart, this.#routeFinish]
            for (const cost of costs) {
                for (const route of routes) {
                    route.linkRoutes(this.#gridMap, this.#ctx, this.blind, cost)
                }
            }
            for (const route of routes) {
                route.stepRoutes(this.#gridMap, this.#ctx, this.blind)
            }
            return true
        }
    }
}