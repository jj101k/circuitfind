(module
    (import "console" "log" (func $log (param i32))) ;; for testing
    ;;(table 0 anyfunc)
    (memory $mem 1)
    (global $l (mut i32) (i32.const 0))
    (global $w (mut i32) (i32.const 0))
    (global $pos_offset i32 (i32.const 32))
    (global $store_offset i32 (i32.const 64))
    (global $empty_node i32 (i32.const 0))
    (global $obstruction_node i32 (i32.const 15))
    (export "addNode" (func $addNode))
    (export "contentAt" (func $contentAt))
    (export "getFromPosition" (func $getFromPosition))
    (export "init" (func $init))
    (export "isLeafNode" (func $isLeafNode))
    (export "isPath" (func $isPath))
    (export "memory" (memory $mem))
    (export "nextSteps" (func $nextSteps))
    (func $addNode
        (param $content i32) ;; 4-bit
        (param $x i32)
        (param $y i32)
        (param $overwrite i32) ;; boolean
        (result i32) ;; boolean
        (local $address i32)
        (local $offset i32)
        (local $bottom i32)
        (local $current i32)
        (local $existing_node i32)

        (local.set $address (i32.add (local.get $x) (i32.mul (local.get $y) (global.get $l))))
        (local.set $offset (i32.shr_u (local.get $address) (i32.const 1)))
        (local.set $bottom (i32.and (local.get $address) (i32.const 1)))

        (local.set $current (call $byteAt (local.get $x) (local.get $y)))
        local.get $overwrite
        if
            ;;
        else
            ;; Check if there is an existing node
            (block
                (result i32)
                (if
                    (result i32)
                    (local.get $bottom)
                    (then
                        local.get $current
                        i32.const 15
                        i32.and
                    )
                    (else
                        local.get $current
                        i32.const 4
                        i32.shr_u
                    )
                )
            )
            if
                (return (i32.const 0))
            end
        end
        local.get $bottom
        if
            (local.set $current
                (i32.or
                    (i32.and
                        (local.get $current)
                        (i32.const 240)
                    )
                    (local.get $content)
                )
            )
        else
            (local.set $current
                (i32.or
                    (i32.and
                        (local.get $current)
                        (i32.const 15)
                    )
                    (i32.shl
                        (local.get $content)
                        (i32.const 4)
                    )
                )
            )
        end
        (call $setByteAt (local.get $x) (local.get $y) (local.get $current))
        i32.const 1
    )
    (func $byteAt
        (param $x i32)
        (param $y i32)
        (result i32) ;; 8-bit
        (local $address i32)
        (local $offset i32)

        (local.set $address (i32.add (local.get $x) (i32.mul (local.get $y) (global.get $l))))
        (local.set $offset (i32.shr_u (local.get $address) (i32.const 1)))

        (i32.load8_u (i32.add (global.get $store_offset) (local.get $offset)))
    )
    (func $contentAt
        (param $x i32)
        (param $y i32)
        (result i32)

        ;; Hey no negatives
        (i32.or
            (i32.or
                (i32.ge_s (local.get $x) (global.get $l))
                (i32.ge_s (local.get $y) (global.get $w))
            )
            (i32.or
                (i32.lt_s (local.get $x) (i32.const 0))
                (i32.lt_s (local.get $y) (i32.const 0))
            )
        )
        if
            (return (global.get $obstruction_node))
        end
        (if
            (result i32)
            (i32.and (i32.add (local.get $x) (i32.mul (local.get $y) (global.get $l))) (i32.const 1))
            (then
                (call $byteAt (local.get $x) (local.get $y))
                i32.const 15
                i32.and
            )
            (else
                (call $byteAt (local.get $x) (local.get $y))
                i32.const 4
                i32.shr_u
            )
        )
    )
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
    (func $init
        (param $l i32)
        (param $w i32)
        (local $end i32)
        (local $size i32)
        (local $store_offset i32)

        (local.set $store_offset (global.get $store_offset))
        (local.set $size
            (i32.shr_u
                (i32.add
                    (i32.mul (local.get $l) (local.get $l))
                    (i32.const 1)
                )
                (i32.const 1)
            )
        )
        (local.set $end
            (i32.add (i32.add (global.get $store_offset) (local.get $size)) (i32.const 1))
        )
        (global.set $l (local.get $l))
        (global.set $w (local.get $w))
        loop
            (i32.store (local.get $store_offset) (i32.const 0))
            (local.set $store_offset (i32.add (local.get $store_offset) (i32.const 1)))
            (br_if 0 (i32.lt_u (local.get $store_offset) (local.get $end)))
        end
    )
    (func $isLeafNode
        (param $x i32)
        (param $y i32)
        (result i32) ;; boolean
        (local $xd i32)
        (local $yd i32)
        (local $c i32)
        (local $pos i64)
        (local $xy i64)

        (local.set $xy
            (i64.add
                (i64.shl (i64.extend_i32_u (local.get $x)) (i64.const 32))
                (i64.extend_i32_u (local.get $y))
            )
        )
        (local.set $xd (i32.const -1))
        loop
            (local.set $yd (i32.const -1))
            loop
                (i32.or (local.get $xd) (local.get $yd))
                if
                    (local.set $c
                        (call $contentAt
                            (i32.add (local.get $x) (local.get $xd))
                            (i32.add (local.get $y) (local.get $yd))
                        )
                    )
                    (call $isPath (local.get $c))
                    if
                        (local.set $pos
                            (i64.load
                                (call $getFromPosition
                                    (i32.add (local.get $x) (local.get $xd))
                                    (i32.add (local.get $y) (local.get $yd))
                                    (local.get $c)
                                )
                            )
                        )
                        (i64.eq (local.get $xy) (local.get $pos))
                        if
                            (return (i32.const 0))
                        end
                    end
                end
                (local.set $yd (i32.add (local.get $yd) (i32.const 1)))
                (br_if 0 (i32.le_s (local.get $yd) (i32.const 1)))
            end
            (local.set $xd (i32.add (local.get $xd) (i32.const 1)))
            (br_if 0 (i32.le_s (local.get $xd) (i32.const 1)))
        end
        i32.const 1
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
    (func $setByteAt
        (param $x i32)
        (param $y i32)
        (param $content i32) ;; 8-bit
        (local $address i32)
        (local $offset i32)

        (local.set $address (i32.add (local.get $x) (i32.mul (local.get $y) (global.get $l))))
        (local.set $offset (i32.shr_u (local.get $address) (i32.const 1)))

        (i32.store8
            (i32.add (global.get $store_offset) (local.get $offset))
            (local.get $content)
        )
    )
)
