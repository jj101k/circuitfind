# What this is

Starting thought: that it's an interesting matter to try to resolve lines
between fixed-position points without overlaps

If you have three of them, that's simple: a triangle.

```
A
|\
| \
B--C
```

If you have four or more... not simple.

```
A--D
|\/|
|/\|
B--C
```

```
/--\
|A--D
||\ |
|| \|
\B--C
```

```
 A-----E
/|\   /|\
|| \ / ||
||  D  ||
|| / \ ||
||/   \||
|B-----C|
\-----/ ?
```

This applies to circuit design, where the points are pins, although the
components they're attached to are very much movable in most cases.

This will attempt to find _shortest paths_ to get through, and when that fails
find the _shortest bridgeable path_, and it will do it iteratively for each
point/line.

```
A
```

```
 .
.A.
 |
.B.
 .
```

```
 A
 | .
.B-C.
 . .
```

```
  .
 ...
..A-+
 .|.|.
  B-C..
   ...
    .
```

```
...
.A+
.|++.
 |.D.
 |...
 B---C
```

# Notes

## To Be Decided

The current algorithm favours diagonals because that's cheaper and indeed that
is literally true for circuits - however I'm building with the expectation of
perpendicular travel and that means it will naturally prefer an awkward stepped
route.

But that's stupid, right?

And in terms of distance, the biggest diff is 2 (v, h) opposed to rt(2) (d); if
we consider 1 in 4 / 3 in 4, those are rt(5) and rt(7) vs 1 + rt(2), the
relative delta is much smaller.

## Limitations

Exhausting the shortest direct paths may involve considering a prohibitively
large number of grid points, although this should be manageable.

## Origin

This is forked from pathfind, which is a path finder for laser squad-like
constraints.

## Diagonal Obstructions

While _pathfind_ considers a diagonal path to be obstructed only if the
destination cell is visibly occupied, this considers it to be obstructed if the
adjacent cells are visible occupied.

For example, move from bottom-left to top-right here is blocked:

```
+-+-+-+-+
| |x| | |
+-+-+-+-+
| | |x| |
+-+-+-+-+
|o| | |x|
+=+-+-+-+
```

In practice, it's convenient to do this by blocking all truly adjacent paths, so
in actuality the obstructions look like this:

```
+-+-+-+-+
|\|x|\| |
+-+-+-+-+
| |\|x|\|
+-+-+-+-+
|o| |\|x|
+=+-+-+-+
```