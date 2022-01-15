/**
 * @extends {testSignature}
 */
class TestBuilder {
    #gridMap
    #start
    #finish

    #findAndObstruct() {
        const position = this.#gridMap.searchEmptyNode(() => ({
            x: Math.floor(Math.random() * this.#gridMap.nodeWidth),
            y: Math.floor(Math.random() * this.#gridMap.nodeWidth),
        }))
        this.#gridMap.source.addNode(OBSTRUCTION_NODE, position, true)
        return position
    }

    get correctLength() {
        return null
    }

    get finish() {
        if(!this.#finish) {
            this.#gridMap.finish = this.#finish = this.#findAndObstruct()
        }
        return this.#finish
    }

    get obstructions() {
        return []
    }

    get passed() {
        return null
    }

    get size() {
        return null
    }

    get start() {
        if(!this.#start) {
            this.#gridMap.start = this.#start = this.#findAndObstruct()
        }
        return this.#start
    }

    /**
     *
     * @param {GridMap} grid_map
     */
    constructor(grid_map) {
        this.#gridMap = grid_map
    }
}