"use strict"
class PathNode extends PositionedNode {
    /**
     *
     * @param {number} content
     * @param {GridMap} grid_map
     * @param {position} position
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
     * @param {position} from_position
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
     * @param {PositionedNode} existingNode
     * @param {GridMap} grid_map
     * @param {Position} position
     * @returns {Generator<{origin: "start" | "finish", node:
     * PositionedNode} | {origin: null, node: PathNode}>}
     */
    static *getPathNodes(existingNode, grid_map, position) {
        let c
        for (
            c = existingNode;
            c;
            position = Position.fromSimple(PathNode.getFromPosition(position.x, position.y, c.content)),
                c = grid_map.nodeAt(position.x, position.y)
        ) {
            if(!(c instanceof PathNode)) {
                if (grid_map.start && position.equals(grid_map.start)) {
                    yield {origin: "start", node: c}
                } else if(grid_map.finish && position.equals(grid_map.finish)) {
                    yield {origin: "finish", node: c}
                } else {
                    throw new Error("Bad path??")
                }
                break
            }
            yield {origin: null, node: c}
        }
    }
    /**
     *
     * @param {PositionedNode} existingNode
     * @param {GridMap} grid_map
     * @param {Position} position
     * @returns {number}
     */
    static getOwner(existingNode, grid_map, position) {
        for(const nodeWithOrigin of this.getPathNodes(existingNode, grid_map, position)) {
            if(nodeWithOrigin.origin == "start") {
                return 1
            } else if(nodeWithOrigin.origin == "finish") {
                return 2
            } else if(nodeWithOrigin.node.owner) {
                return nodeWithOrigin.node.owner
            }
        }
        throw new Error("Could not backtrack path")
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

    get owner() {
        if(this.content < 0b0111) {
            return 1
        } else if (this.content > 0b1000) {
            return 2
        } else {
            return null
        }
    }

    /**
     *
     * @param {GridMap} grid_map
     * @param {position} position
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
