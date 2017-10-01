"use strict"

var c = document.getElementById("grid")
if(c instanceof HTMLCanvasElement) {
    var ctx = c.getContext("2d")

    let w = 500
    let l = 10
    let cw = w / l
    ctx.scale(cw, cw)
    for(let x = 1; x < 10; x++) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, l)
    }
    for(let y = 1; y < 10; y++) {
        ctx.moveTo(0, y)
        ctx.lineTo(l, y)
    }
    ctx.lineWidth = 2 / cw
    ctx.stroke()

    for(let i = 0; i < 31; i++) {
        let cx = Math.floor(Math.random() * 10)
        let cy = Math.floor(Math.random() * 10)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.fillStyle = "red"
        ctx.fillRect(0.1, 0.1, 0.8, 0.8)
        ctx.restore()
    }
} else {
    console.log("Well, that's the wrong element type")
}