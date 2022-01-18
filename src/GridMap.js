"use strict"
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
        /**
         * @type {?{x: number, y: number}}
         */
        this.finish = null
        this.nodeWidth = node_width
        this.source = GridMapSource.build(node_width)
        /**
         * @type {?{x: number, y: number}}
         */
        this.start = null
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
        if (this.cw >= 3) {
            for (let x = 0; x <= this.nodeWidth; x++) {
                ctx.moveTo(x, 0)
                ctx.lineTo(x, this.nodeWidth)
            }
            for (let y = 0; y <= this.nodeWidth; y++) {
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
        switch (content) {
            case EMPTY_NODE:
                return null
            case OBSTRUCTION_NODE:
                return new PositionedNode(content)
            default:
                return new PathNode(content)
        }
    }
    /**
     * This clears the storage of everything that's not an obstruction
     */
    replaceNonObstruction() {
        for (let x = 0; x <= this.nodeWidth; x++) {
            for (let y = 0; y <= this.nodeWidth; y++) {
                const s = this.source.contentAt(x, y)
                if (s != EMPTY_NODE && s != OBSTRUCTION_NODE) {
                    this.source.addNode(EMPTY_NODE, { x, y }, true)
                }
            }
        }
    }
    /**
     *
     * @param {() => {x: number, y: number}} f
     */
    searchEmptyNode(f) {
        let point
        let tries = 0
        const maxTries = 1000
        do {
            point = f()
            tries++
            if(tries > maxTries) {
                throw new Error("Max tries exceeded")
            }
        } while (this.source.contentAt(point.x, point.y) != EMPTY_NODE)
        return point
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
    /**
     * This clears the display of everything that's not an obstruction
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {string | null} [fillStyle]
     */
    wipeNonObstruction(ctx, fillStyle = null) {
        ctx.save()
        ctx.fillStyle = fillStyle ?? (this.cw > 10 ? "white" : "#888")
        let lastX = 0
        let lastY = 0

        for (let x = 0; x <= this.nodeWidth; x++) {
            for (let y = 0; y <= this.nodeWidth; y++) {
                if(this.source.contentAt(x, y) != OBSTRUCTION_NODE) {
                    ctx.translate(x - lastX, y - lastY)
                    lastX = x
                    lastY = y
                    ctx.fillRect(0.125, 0.125, 0.75, 0.75)
                }
            }
        }

        ctx.restore()
    }
}
