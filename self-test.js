"use strict"

function selfTest(continue_on_failure = false) {
    const init_by_name = {
        contentAt: () => {
            const s = GridMapSource.build(16, 16)
            for(let i = 0; i < 16; i++) {
                s.addNode(i, {x: i, y: 0}, false)
                s.addNode(i, {x: i, y: 1}, false)
                if(i >= 8) {
                    s.addNode(i, {x: i - 1, y: 1}, true) // will succeed
                } else if(i > 0) {
                    s.addNode(i, {x: i - 1, y: 1}, false) // will fail except for 0
                }
            }
            return s
        },
    }
    const tests_by_name = {
        contentAt: [
            ...[...new Array(16)].map((v, i) => ({
                f: s => s.contentAt(i, 0),
                v: i,
            })),
            ...[...new Array(16)].map((v, i) => ({
                f: s => s.contentAt(i, 1),
                v: (!i || i >= 7 && i <= 14) ? i + 1 : i,
            })),
            {
                f: s => s.contentAt(-1, 0),
                v: OBSTRUCTION_NODE,
            },
            {
                f: s => s.contentAt(0, -1),
                v: OBSTRUCTION_NODE,
            },
            {
                f: s => s.contentAt(16, 0),
                v: OBSTRUCTION_NODE,
            },
            {
                f: s => s.contentAt(0, 16),
                v: OBSTRUCTION_NODE,
            },
        ],
        getFromPosition: [
            // 0 is by definition not a path node
            {
                f: () => PathNode.getFromPosition(0, 0, 1),
                v: {x: 0, y: 1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 2),
                v: {x: 1, y: 0},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 3),
                v: {x: 0, y: -1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 4),
                v: {x: -1, y: 0},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 5),
                v: {x: 1, y: 1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 6),
                v: {x: 1, y: -1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 7),
                v: {x: -1, y: 1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 8),
                v: {x: -1, y: -1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 9),
                v: {x: 0, y: 1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 10),
                v: {x: 1, y: 0},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 11),
                v: {x: 0, y: -1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 12),
                v: {x: -1, y: 0},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 13),
                v: {x: 1, y: 1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 14),
                v: {x: 1, y: -1},
            },
            {
                f: () => PathNode.getFromPosition(0, 0, 15),
                v: {x: -1, y: 1},
            },
        ],
        isPath: [...new Array(16)].map((v, i) => ({
            f: () => PathNode.isPath(i),
            v: i != OBSTRUCTION_NODE && i != EMPTY_NODE,
        })),
        nextSteps: [
            {
                f: () => PositionedNode.nextSteps({x: 0, y: 0}, "cheap"),
                v: [{x: -1, y: 0}, {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}],
            },
            {
                f: () => PositionedNode.nextSteps({x: 0, y: 0}, "expensive"),
                v: [{x: -1, y: -1}, {x: -1, y: 1}, {x: 1, y: -1}, {x: 1, y: 1}],
            },
            {
                f: () => PositionedNode.nextSteps({x: 30, y: 30}, "expensive"),
                v: [{x: 29, y: 29}, {x: 29, y: 31}, {x: 31, y: 29}, {x: 31, y: 31}],
            },
            {
                f: () => PositionedNode.nextSteps({x: 30, y: 30}, "cheap"),
                v: [{x: 29, y: 30}, {x: 30, y: 29}, {x: 31, y: 30}, {x: 30, y: 31}],
            },
        ],
    }
    for(const [name, tests] of Object.entries(tests_by_name)) {
        const s = init_by_name[name] && init_by_name[name]()
        for(const [i, t] of Object.entries(tests)) {
            console.log(`Test ${name}: ${i}`)
            const result = t.f(s)
            if(JSON.stringify(result) != JSON.stringify(t.v)) {
                const e = new Error(`Internal test failed at ${i} (${t.f}), got ${JSON.stringify(result)} but expected ${JSON.stringify(t.v)}`)
                if(continue_on_failure) {
                    console.error(e)
                } else {
                    throw e
                }
            } else {
                console.log(`Passed`)
            }
        }
    }
}