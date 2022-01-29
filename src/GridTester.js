"use strict"
class GridTester {
    /**
     * @type {?HTMLCanvasElement}
     */
    #canvasElement

    /**
     * @type {?GridTestRunner}
     */
    #runner

    get canvasElement() {
        if(!this.#canvasElement) {
            /**
             * @type {?HTMLCanvasElement}
             */
            const c = document.querySelector("canvas#grid")
            if(c) {
                c.width = c.clientWidth * window.devicePixelRatio
                c.height = c.clientHeight * window.devicePixelRatio
            }
            this.#canvasElement = c
        }
        return this.#canvasElement
    }

    constructor() {
        this.blind = false
        this.tests = []
        this.nextTestNumber = 0
        this.paused = false
    }
    dumpGeneratedState() {
        console.log(JSON.stringify(this.#runner?.generatedState))
    }
    displayResults() {
        const results = this.#runner?.results
        if(!results) {
            throw new Error("No results found")
        }
        const tr = document.createElement("tr")
        let td = document.createElement("td")
        td.textContent = results.testNumber === null ?
            "Random test" :
            `Test ${results.testNumber}`
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = results.cost === Infinity ?
            "miss" :
            "" + results.cost
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = "" + results.innerRuntime
        tr.appendChild(td)

        td = document.createElement("td")
        td.textContent = results.currentTest ?
            "" + results.currentTest.correctLength :
            "N/A"

        tr.appendChild(td)

        if (results.currentTest && results.currentTest.correctLength != results.cost) {
            tr.style.color = "red"
        }
        const testResultsElement = document.querySelector("#test-results")
        if (testResultsElement) {
            testResultsElement.appendChild(tr)
        }
    }
    /**
     *
     * @param {Partial<testSignature>} test
     */
    initForRandomInstance(test) {
        if(!this.canvasElement) {
            throw new Error("Could not find canvas")
        }
        const ctx = this.canvasElement.getContext("2d")
        if (!ctx)
            throw new Error("canvas context is null")

        this.#runner = new GridTestRunner(ctx, test, this.canvasElement.width)
        return this.#runner
    }
    /**
     *
     * @param {testSignature} test
     * @param {?number} testNumber
     */
    initForTest(test, testNumber = null) {
        const runner = this.initForRandomInstance(test)

        runner.postInitForTest(test, testNumber)

        const input = document.querySelector("input#test-number")
        if (input instanceof HTMLInputElement) {
            input.value = (testNumber === null) ? "" : ("" + testNumber)
        }
        return runner
    }
    nextTest() {
        const runner = this.initForTest(this.tests[this.nextTestNumber], this.nextTestNumber)
        if (!this.paused) {
            runner.run()
            this.displayResults()
        }
        this.nextTestNumber = (this.nextTestNumber + 1) % this.tests.length
    }
    /**
     *
     * @param {number} [times]
     * @param {number} [s]
     */
    async randomTest(times = 10, s = 10) {
        const runner = this.initForRandomInstance({size: s})
        for (let i = 0; i < times; i++) {
            await runner.reinitForRandomInstance()
            if (!this.paused) {
                if (this.blind) {
                    const start = new Date().valueOf()
                    await runner.run(0)
                    const end = new Date().valueOf()
                    console.log(`Took ${end - start} ms`)
                } else {
                    await runner.run()
                }
                this.displayResults()
            }
        }
        runner.deinit()
    }
    async runAll() {
        for (const [i, test] of Object.entries(this.tests)) {
            const runner = this.initForTest(test, +i)
            await runner.run(10)
            this.displayResults()
        }
    }
    selectTest(n) {
        const runner = this.initForTest(this.tests[n], n)
        if (!this.paused) {
            runner.run()
            this.displayResults()
        }
    }
}
