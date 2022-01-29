"use strict"
class GridTestRunner {
    /**
     * @type {CanvasRenderingContext2D}
     */
    #ctx

    /**
     * @type {GridMap}
     */
    #gridMap

    /**
     * @type {?GridTest}
     */
    #inner = null

    /**
     * @type {number}
     */
    #nodeWidth

    /**
     * @type {number}
     */
    #pixelWidth

    /**
     * Information about the test
     */
    get generatedState() {
        return {
            ...this.#inner?.generatedState,
            passed: null,
            correctLength: null,
            size: this.#nodeWidth,
        }
    }

    /**
     * Information about how the test went
     */
    get results() {
        if (!this.#inner) {
            throw new Error("No test described")
        }

        return this.#inner.results
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {Partial<testSignature>} test
     * @param {number} pixelWidth The number of pixels per side the canvas can
     * neatly display
     */
    constructor(ctx, test, pixelWidth) {
        this.#nodeWidth = test.size ?? 10
        this.#pixelWidth = pixelWidth

        const scale = this.#pixelWidth / this.#nodeWidth

        ctx.restore()
        ctx.save()
        ctx.scale(scale, scale)
        this.#ctx = ctx

        this.#gridMap = new GridMap(this.#pixelWidth, this.#nodeWidth)
        this.#gridMap.display(this.#ctx)
    }

    /**
     * This cleans up display of non-obstructions
     */
    deinit() {
        this.#gridMap.wipeNonObstruction(this.#ctx, "black")
    }

    /**
     * This clears path markers and attaches a new test
     */
    async reinitForRandomInstance() {
        await this.#gridMap.replaceNonObstruction()
        const test = new TestBuilder(this.#gridMap)

        this.#inner = new GridTest(this.#ctx, this.#gridMap, test)
    }

    /**
     *
     * @param {testSignature} test
     * @param {?number} [testNumber]
     */
    postInitForTest(test, testNumber = null) {
        this.#inner = new GridTest(this.#ctx, this.#gridMap, test, testNumber)
    }

    /**
     * Runs the test. Where interval_ms is nonzero, that's the usual wait
     * between frame updates (default 10ms). You can think of this as operating
     * in a "vsync" mode.
     *
     * @param {number} interval_ms
     */
    run(interval_ms = 10) {
        if(!this.#inner) {
            throw new Error("No test set up")
        }
        return this.#inner.run(interval_ms)
    }
}
