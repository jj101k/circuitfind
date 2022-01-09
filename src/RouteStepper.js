"use strict"
class RouteStepper {
    /**
     *
     * @param {number} side
     * @param {{x: number, y: number}} position
     */
    constructor(side, position) {
        this.side = side
        /** @type {{[cost: number]: {from: {x: number, y: number}, to: {x: number, y: number}}[]}} */
        this.newRoutes = {
            4: [],
            6: [],
        }
        /** @type {{[cost: number]: {x: number, y: number}[]}} */
        this.routes = {
            0: [position],
            2: [],
            4: [],
            6: [],
        }

        this.biggestRouteCount = 0
    }
    get zeroPositions() {
        return this.routes[0]
    }
    /**
     *
     * @param {{x: number, y: number}} target_position
     * @param {boolean} cheap
     * @param {GridMap} grid_map
     * @returns {?Route}
     */
    stepOut(target_position, cheap, grid_map) {
        /** @type {?Route} */
        let route = null
        let last_route_length = 0

        const step_type = cheap ? "cheap" : "expensive"
        const cost = cheap ? 4 : 6
        for (const position of this.zeroPositions) {
            for (const step of GeneralNode.nextSteps(position, step_type)) {
                if (grid_map.validAddress(step.x, step.y)) {
                    const existing_content = grid_map.source.contentAt(step.x, step.y)
                    if (existing_content == EMPTY_NODE) {
                        this.addNewRoute(cost, { from: position, to: step })
                    } else if ((
                        // Directly reach the target (it happens)
                        step.x == target_position.x &&
                        step.y == target_position.y
                    ) || (
                            // Reach one of the target's path nodes
                            PathNode.isPath(existing_content) &&
                            grid_map.source.isLeafNode(step) &&
                            PathNode.getOwner(existing_content, grid_map, step) != this.side
                        )) {
                        const r = new Route(position, step)
                        const route_cost = r.getCost(grid_map)
                        if (!route) {
                            route = r
                            last_route_length = route_cost
                        } else if (last_route_length > route_cost) {
                            route = r
                            last_route_length = route_cost
                        }
                    }
                }
            }
        }

        if (route) {
            console.log("Route found")
            return route
        } else if (this.hasRoutes()) {
            return null
        } else {
            return new Route()
        }
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} blind
     * @param {number} cost
     */
    linkRoutes(grid_map, ctx, blind, cost) {
        for (const r of this.newRoutesFor(cost)) {
            const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
            if (grid_map.source.addNode(content, r.to) && !blind) {
                PathNode.displayAt(content, grid_map, r.to, ctx, this.side)
            }
        }
    }
    /**
     *
     * @param {number} n
     * @param {{from: {x: number, y: number}, to: {x: number, y: number}}} r
     */
    addNewRoute(n, r) {
        this.newRoutes[n].push(r)
    }
    hasRoutes() {
        return (
            Object.values(this.newRoutes).some(r => r.length) ||
            Object.values(this.routes).some(r => r.length)
        )
    }
    /**
     *
     * @param {number} n
     */
    newRoutesFor(n) {
        return this.newRoutes[n]
    }
    /**
     *
     * @param {GridMap} grid_map
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} blind
     */
    stepRoutes(grid_map, ctx, blind) {
        if (!blind) {
            for (const position of this.zeroPositions) {
                const path = grid_map.nodeAt(position.x, position.y)
                if (path instanceof PathNode) {
                    path.display(grid_map, position, ctx, "black")
                }
            }
        }
        this.stepRoutesInner(grid_map)
    }
    /**
     * @param {GridMap} grid_map
     */
    stepRoutesInner(grid_map) {
        this.routes = {
            0: this.routes[2],
            2: this.routes[4].concat(this.newRoutes[4].filter(r => {
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
                return grid_map.source.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
            4: this.routes[6].concat(this.newRoutes[6].filter(r => {
                const content = PathNode.encodeFromDirection(r.to.x, r.to.y, r.from, this.side)
                return grid_map.source.contentAt(r.to.x, r.to.y) == content
            }).map(r => r.to)),
            6: [],
        }
        this.newRoutes = {
            4: [],
            6: [],
        }
    }
}
