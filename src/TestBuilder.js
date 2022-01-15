class TestBuilder {
    #gridMap
    #startPosition
    #finishPosition

    #findAndObstruct() {
        const position = this.#gridMap.searchEmptyNode(() => ({
            x: Math.floor(Math.random() * this.#gridMap.nodeWidth),
            y: Math.floor(Math.random() * this.#gridMap.nodeWidth),
        }))
        this.#gridMap.source.addNode(OBSTRUCTION_NODE, position, true)
        return position
    }

    get finishPosition() {
        if(!this.#finishPosition) {
            this.#gridMap.finish = this.#finishPosition = this.#findAndObstruct()
        }
        return this.#finishPosition
    }

    get startPosition() {
        if(!this.#startPosition) {
            this.#gridMap.start = this.#startPosition = this.#findAndObstruct()
        }
        return this.#startPosition
    }

    /**
     *
     * @param {GridMap} grid_map
     */
    constructor(grid_map) {
        this.#gridMap = grid_map
    }
}