"use strict"
class PathNode extends PositionedNode {
    /**
     *
     * @param {number} content
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} side
     */
    static displayAt(content, grid_map, position, ctx, side) {
        const p = new PathNode(content)
        p.display(grid_map, position, ctx, "light" + (side & 1 ? "blue" : "green"))
    }
    /**
     *
     * @param {number} x
     * @param {number} y
     * @param {{x: number, y: number}} from_position
     * @param {number} side
     */
    static encodeFromDirection(x, y, from_position, side) {
        const dx = x - from_position.x
        const dy = y - from_position.y
        let direction
        if (Math.abs(dx) - Math.abs(dy) == 0) {
            // diagonal
            direction = (4 + Math.abs(dx) + dx + (Math.abs(dy) + dy) / 2)
        } else {
            // straight
            direction = (Math.abs(dx) + dx + dy + 1)
        }
        if (side == 2 && direction < 6) {
            return direction + 0b1000 + 1
        } else {
            return direction + 1
        }
    }
    /**
     * The position a node came from.
     *
     * 7 2 5
     * 3   1
     * 6 0 4
     *
     * @param {number} x
     * @param {number} y
     * @param {number} from_content
     */
    static getFromPosition(x, y, from_content) {
        const from_direction = (from_content - 1) & 0b111
        let dx
        let dy
        if (from_direction >= 4) { // [4..15] <- [5..15, 16(*)]
            dx = 1 - (from_direction & 2)
            dy = 1 - (from_direction % 2) * 2
        } else if (from_direction % 2) { // [1, 3] <- [2, 4]
            dx = 2 - from_direction
            dy = 0
        } else { // [0, 2] <- [1, 3]
            dx = 0
            dy = 1 - from_direction
        }
        return { x: x + dx, y: y + dy }
    }
    /**
     *
     * @param {number} content
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @returns {number}
     */
    static getOwner(content, grid_map, position) {
        let c
        for (c = content; PathNode.isPath(c); position = PathNode.getFromPosition(position.x, position.y, c),
            c = grid_map.source.contentAt(position.x, position.y)) {
            if (c < 0b0111) {
                return 1
            } else if (c > 0b1000) {
                return 2
            }
        }
        if (position.x == grid_map.start.x && position.y == grid_map.start.y) {
            return 1
        } else {
            return 2
        }
    }
    /**
     *
     * @param {number} content
     * @returns {boolean}
     */
    static isPath(content) {
        return content != EMPTY_NODE && content != OBSTRUCTION_NODE
    }
    get fromDirection() {
        switch ((this.content - 1) & 0b111) {
            case 0: return "\u2193"
            case 1: return "\u2192"
            case 2: return "\u2191"
            case 3: return "\u2190"
            case 4: return "\u2198"
            case 5: return "\u2197"
            case 6: return "\u2199"
            case 7: return "\u2196"
            default: return "?"
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {{x: number, y: number}} position
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} colour
     */
    display(grid_map, position, ctx, colour) {
        super.display(grid_map, position, ctx, colour)
        GridMap.displayNode(ctx, position, grid_map.cw > 10 ? () => {
            ctx.scale(0.1, 0.1)
            ctx.font = "7px Arial"
            ctx.fillStyle = "#888"
            const m = ctx.measureText(this.fromDirection)
            ctx.fillText(this.fromDirection, Math.ceil(4 - m.width / 2), 7)
        } : () => { })
    }
}
