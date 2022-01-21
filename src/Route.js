"use strict"
class Route {
    /**
     *
     * @param {?{x: number, y: number}} left
     * @param {?{x: number, y: number}} right
     */
    constructor(left = null, right = null) {
        this.left = left
        this.right = right
    }
    /**
     * This burns the path onto the map as obstacles, 3-wide.
     *
     * @param {GridMap} grid_map
     */
    burn(grid_map) {
        const o = new PositionedNode(OBSTRUCTION_NODE)
        for (const node of this.getNodes(grid_map)) {
            for(const delta of [-1, 1]) {
                grid_map.source.addNode(o.content, {x: node.x + delta, y: node.y}, true)
                grid_map.source.addNode(o.content, {x: node.x, y: node.y + delta}, true)
            }
            grid_map.source.addNode(o.content, node, true)
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     */
    display(grid_map, ctx) {
        this.getNodes(grid_map).forEach(n => {
            const m = grid_map.nodeAt(n.x, n.y)
            if (!this.left)
                throw new Error("this.left is null")
            if (!this.right)
                throw new Error("this.right is null")
            if (!m)
                throw new Error("node is null")
            if (n.x == this.left.x && n.y == this.left.y) {
                m.display(grid_map, n, ctx, "pink")
            } else if (n.x == this.right.x && n.y == this.right.y) {
                m.display(grid_map, n, ctx, "yellow")
            } else {
                m.display(grid_map, n, ctx, "orange")
            }
        })
    }
    /**
     *
     * @param {GridMap} grid_map
     * @returns {number}
     */
    getCost(grid_map) {
        if (!this.left)
            return Infinity
        if (!this.right)
            throw new Error("this.right is null")
        let cost = 0
        if (this.left.x == this.right.x || this.left.y == this.right.y) {
            cost += 4
        } else {
            cost += 6
        }
        for(const n of this.getNodes(grid_map)) {
            const m = grid_map.contentAt(n.x, n.y)
            const mf = PathNode.getFromPosition(n.x, n.y, m)
            if (mf.x == n.x || mf.y == n.y) {
                cost += 4
            } else {
                cost += 6
            }
        }
        return cost
    }
    /**
     *
     * @param {GridMap} grid_map
     * @return {{x: number, y: number}[]}
     */
    getNodes(grid_map) {
        if (!this.left)
            throw new Error("this.left is null")
        if (!this.right)
            throw new Error("this.right is null")
        let [a, b] = [this.left, this.right]
        /** @type {{x: number, y: number}[]} */
        const nodes = []

        let tries
        const maxTries = 1000

        let ac = grid_map.contentAt(a.x, a.y)
        tries = 0
        while (PathNode.isPath(ac)) {
            nodes.push(a)
            a = PathNode.getFromPosition(a.x, a.y, ac)
            ac = grid_map.contentAt(a.x, a.y)
            tries++
            if(tries > maxTries) {
                throw new Error("Max tries exceeded")
            }
        }

        let bc = grid_map.contentAt(b.x, b.y)
        tries = 0
        while (PathNode.isPath(bc)) {
            nodes.unshift(b)
            b = PathNode.getFromPosition(b.x, b.y, bc)
            bc = grid_map.contentAt(b.x, b.y)
            tries++
            if(tries > maxTries) {
                throw new Error("Max tries exceeded")
            }
        }
        return nodes
    }
}
