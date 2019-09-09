(module
    ;;(table 0 anyfunc)
    (memory $mem 1)
    (export "memory" (memory $mem))
    (export "nextSteps" (func $nextSteps))
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