"use strict"

/**
 * @typedef m_exports
 * @property {WebAssembly.Memory} memory
 * @property {(content: number, position_x: number, position_y: number,
 * overwrite: number) => number} addNode
 * @property {(x: number, y: number) => number} contentAt
 * @property {(position_x: number,
 * position_y: number) => number} isLeafNode
 * @property {(position_x: number, position_y:
 * number, step_type: number) => number} nextSteps
 * @property {(x: number, y: number,
 * content: number) => number} getFromPosition
 * @property {(content: number) => number} isPath
 * @property {(node_width: number) => *} init
 */

/**
 * @param {m_exports} m_exports
 */
function load_webassembly(m_exports) {
    const h = new Int32Array(m_exports.memory.buffer)
    GeneralNode.nextSteps =
    /**
     *
     * @param {position} position
     * @param {"cheap" | "expensive"} step_type
     * @returns {position[]}
     */
    (position, step_type) => {
        const p = m_exports.nextSteps(position.x, position.y, +(step_type == "expensive"))
        return [
            {x: h[p + 0], y: h[p + 1]},
            {x: h[p + 2], y: h[p + 3]},
            {x: h[p + 4], y: h[p + 5]},
            {x: h[p + 6], y: h[p + 7]},
        ]
    }
    PathNode.getFromPosition = (x, y, content) => {
        const offset = m_exports.getFromPosition(x, y, content)
        return {
            x: h[offset / 4 + 1],
            y: h[offset / 4 + 0],
        }
    }
    PathNode.isPath = content => !!m_exports.isPath(content)
    GridMapSource.build = (node_width) => {
        m_exports.init(node_width)
        return {
            addNode(content, position, overwrite) {
                return !!m_exports.addNode(content, position.x, position.y, +!!overwrite)
            },
            contentAt: m_exports.contentAt,
            isLeafNode(position) {
                return !!m_exports.isLeafNode(position.x, position.y)
            },
            nodes: [],
            nodeWidth: node_width,
        }
    }
}
const webassembly_import = {
    console: {
        /**
         * For debugging. Wraps actual console.log.
         *
         * @param {number} n
         */
        log(n) {
            console.log(n)
        },
    },
}

if(location.protocol == "file:") {
    /** @type {HTMLInputElement | null} */
    const e = document.querySelector("#wasm-import")
    if(!e) {
        throw new Error("Cannot find import element")
    }
    e.onchange = async function() {
        if(e.files) {
            const fr = new FileReader()
            fr.onload = () => {
                if(!(fr.result instanceof ArrayBuffer)) throw new Error("Wrong result type?")
                const m = new WebAssembly.Instance(new WebAssembly.Module(fr.result), webassembly_import)
                //@ts-ignore
                load_webassembly(m.exports)
            }
            fr.readAsArrayBuffer(e.files[0])
        }
    }
} else {
    /**
     * @type {HTMLElement}
     */
    //@ts-ignore
    const wi = document.querySelector("#wasm-import")
    wi.style.display = "none"

    const p_response = fetch("core.wasm")
    if("instantiateStreaming" in WebAssembly) {
        WebAssembly.instantiateStreaming(p_response, webassembly_import).then(
            //@ts-ignore
            result => load_webassembly(result.instance.exports)
        ).then(
            () => console.log("WebAssembly core loaded")
        )
    } else {
        p_response.then(
            response => response.arrayBuffer()
        ).then(
            bytes => WebAssembly.instantiate(bytes, webassembly_import)
        ).then(
            //@ts-ignore
            result => load_webassembly(result.instance.exports)
        ).then(
            () => console.log("WebAssembly core loaded")
        )
    }
}