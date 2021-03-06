class GridMapSource {
    /**
     *
     * @param {number} node_width
     */
    static build(node_width) {
        return new GridMapSource(node_width)
    }
    /**
     *
     * @param {number} node_width
     */
    constructor(node_width) {
        this.nodeWidth = node_width
        /** @type {number[]} */
        this.nodes = Array(Math.ceil(node_width * node_width / 2)).map(v => 0)
    }
    /**
     *
     * @param {number} content
     * @param {position} position
     * @param {boolean} overwrite
     * @returns {boolean}
     */
    addNode(content, position, overwrite = false) {
        const address = position.x + position.y * this.nodeWidth
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
        if(x < 0 || y < 0 || x >= this.nodeWidth || y >= this.nodeWidth) {
            return OBSTRUCTION_NODE
        }
        const address = x + y * this.nodeWidth
        const offset = address >> 1
        const bottom = address & 1
        return bottom ?
            (this.nodes[offset] & FOUR_BITS) :
            (this.nodes[offset] >> 4)
    }
    /**
     * True if `position` is a leaf node, ie a non-target.
     *
     * @param {Position} position
     * @returns {boolean}
     */
    isLeafNode(position) {
        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x || y) {
                    const position2 = position.add(new Position(x, y))
                    const c = this.contentAt(position2.x, position2.y)
                    if(PathNode.isPath(c)) {
                        const pos = PathNode.getFromPosition(
                            position2.x,
                            position2.y,
                            c
                        )
                        if(position.equals(pos)) return false
                    }
                }
            }
        }
        return true
    }
}

class GeneralNode {
    /**
     *
     * @param {Position} position
     * @param {"cheap" | "expensive"} step_type
     * @returns {Position[]}
     */
    static nextSteps(position, step_type) {
        /** @type {Position[]} */
        const steps = []
        if(step_type == "cheap") {
            steps.push(...[
                {x: -1, y:  0},
                {x:  0, y: +1},
                {x: +1, y:  0},
                {x:  0, y: -1},
            ].map(p => position.add(p)))
        } else {
            // This is ordered to get a circular order
            steps.push(...[
                {x: -1, y: -1},
                {x: -1, y: +1},
                {x: +1, y: +1},
                {x: +1, y: -1},
            ].map(p => position.add(p)))
        }
        return steps
    }
}