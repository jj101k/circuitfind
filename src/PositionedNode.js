"use strict"
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
     * @param {position} position
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
