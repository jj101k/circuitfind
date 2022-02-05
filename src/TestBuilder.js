/**
 * @extends {testSignature}
 */
class TestBuilder {
    #gridMap
    #start
    #finish

    #findFreePosition() {
        const position = this.#gridMap.searchEmptyNode(() => new Position(
            Math.floor(Math.random() * this.#gridMap.nodeWidth),
            Math.floor(Math.random() * this.#gridMap.nodeWidth),
        ))
        return position
    }

    get correctLength() {
        return null
    }

    get finish() {
        if(!this.#finish) {
            this.#finish = this.#findFreePosition()
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
            this.#start = this.#findFreePosition()
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