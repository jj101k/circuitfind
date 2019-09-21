(module
    (import "console" "log" (func $log (param i32))) ;; for testing
    ;;(table 0 anyfunc)
    (memory $mem 1)
    (global $pos_offset i32 (i32.const 32))
    (global $empty_node i32 (i32.const 0))
    (global $obstruction_node i32 (i32.const 15))
    (export "getFromPosition" (func $getFromPosition))
    (export "isPath" (func $isPath))
    (export "memory" (memory $mem))
    (export "nextSteps" (func $nextSteps))
    (func $getFromPosition
        (param $x i32)
        (param $y i32)
        (param $from_content i32) ;; unsigned
        (result i32)
        (local $from_direction i32) ;; unsigned
        (local $dx i32)
        (local $dy i32)

        (local.set $from_direction
            (i32.and
                (i32.sub (local.get $from_content) (i32.const 1))
                (i32.const 7)
            )
        )
        (i32.ge_u (local.get $from_direction) (i32.const 4))
        if ;; [4..15] <- [5..15, 16(*)] "xy delta"
            (local.set $dx
                (i32.sub
                    (i32.const 1)
                    (i32.and (local.get $from_direction) (i32.const 2))
                )
            )
            (local.set $dy
                (i32.sub
                    (i32.const 1)
                    (i32.mul
                        (i32.rem_u (local.get $from_direction) (i32.const 2))
                        (i32.const 2)
                    )
                )
            )
        else
            (i32.rem_u
                (local.get $from_direction)
                (i32.const 2)
            )
            if ;; [1, 3] <- [2, 4] "x delta"
                (local.set $dx
                    (i32.sub (i32.const 2) (local.get $from_direction))
                )
                (local.set $dy (i32.const 0))
            else ;; [0, 2] <- [1, 3] "y delta"
                (local.set $dx (i32.const 0))
                (local.set $dy
                    (i32.sub (i32.const 1) (local.get $from_direction))
                )
            end
        end
        (i64.store
            (global.get $pos_offset)
            (i64.add
                (i64.shl
                    (i64.extend_i32_u
                        (i32.add
                            (local.get $x)
                            (local.get $dx)
                        )
                    )
                    (i64.const 32)
                )
                (i64.extend_i32_u
                    (i32.add
                        (local.get $y)
                        (local.get $dy)
                    )
                )
            )
        )
        global.get $pos_offset
    )
    (func $isPath
        (param $content i32)
        (result i32)

        (i32.and
            (i32.ne (local.get $content) (global.get $empty_node))
            (i32.ne (local.get $content) (global.get $obstruction_node))
        )
    )
    (func $nextSteps
        (param $x i32) (param $y i32) (param $expensive i32)
        (result i32) ;; pointer to 32 bytes of coordinates ({x1, y1} ... {x4, y4} all in i32 format)
        (local $pointer i32) (local $store_offset i32) (local $xdelta i32) (local $ydelta i32)

        i32.const 0
        local.tee $pointer
        local.set $store_offset

        local.get $expensive
        if
            (local.set $xdelta (i32.const -1))
            loop
                (local.set $ydelta (i32.const -1))
                loop
                    (i32.store (local.get $store_offset) (i32.add (local.get $xdelta) (local.get $x)))
                    (i32.store (i32.add (local.get $store_offset) (i32.const 4)) (i32.add (local.get $y) (local.get $ydelta)))

                    (local.set $store_offset (i32.add (i32.const 8) (local.get $store_offset)))
                    (local.set $ydelta (i32.add (i32.const 2) (local.get $ydelta)))

                    (br_if 0 (i32.eq (local.get $ydelta) (i32.const 1)))
                end

                (local.set $xdelta (i32.add (i32.const 2) (local.get $xdelta)))

                (br_if 0 (i32.eq (local.get $xdelta) (i32.const 1)))
            end
        else
            (local.set $ydelta (i32.const -1))
            loop
                (i32.store (local.get $store_offset) (i32.add (local.get $x) (local.get $ydelta)))
                (i32.store (i32.add (i32.const 4) (local.get $store_offset)) (local.get $y))
                (i32.store (i32.add (i32.const 8) (local.get $store_offset)) (local.get $x))
                (i32.store (i32.add (i32.const 12) (local.get $store_offset)) (i32.add (local.get $y) (local.get $ydelta)))

                (local.set $ydelta (i32.add (i32.const 2) (local.get $ydelta)))
                (local.set $store_offset (i32.add (i32.const 16) (local.get $store_offset)))

                (br_if 0 (i32.eq (local.get $ydelta) (i32.const 1)))
            end
        end
        local.get $pointer
    )
)