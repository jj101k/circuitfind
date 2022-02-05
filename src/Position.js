/**
 *
 */
class Position {
    /**
     *
     * @param {position} a
     * @param {position} b
     * @param {keyof Position} key
     * @returns {[number, number]}
     */
    static combine(a, b, key) {
        return [a[key], b[key]]
    }
    /**
     *
     * @param {position} a
     * @param {position} b
     * @param {(a: number, b: number) => number} f
     */
    static from(a, b, f) {
        return new Position(
            f(...this.combine(a, b, "x")),
            f(...this.combine(a, b, "y"))
        )
    }

    /**
     *
     * @param {position} p
     */
    static fromSimple(p) {
        return new Position(p.x, p.y)
    }

    /**
     *
     * @param x
     * @param y
     */
    constructor(x, y) {
        this.x = x
        this.y = y
    }
    /**
     *
     * @param {position} p
     */
    add(p) {
        return Position.from(this, p, (a, b) => a + b)
    }
    /**
     *
     * @param {position} p
     */
    equals(p) {
        return p.x == this.x && p.y == this.y
    }
}