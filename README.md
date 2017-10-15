# What this is

Overheard: that Laser Squad (or was it UFO?) had to use precomputed paths
between map areas because the cost was too high to compute it each time.

Hypothesis: that's not true for reasonable limits.

# The test scenario (based on Laser Squad)

Map size: roughly 50x100

RAM: 48K in 16KB banks (switching is expensive but not prohibitive). It's not
clear if Laser Squad ever supported the Spectrum 16K, but with a 1988 release
the current Speccy was 128K and had been for 4 years so 48K seems conservative.
Other platforms (Commodore, Amstrad) would have often been 64KB. "Available" RAM
is unclear, but a minority of 48KB should be fine.

CPU: 3.5MHz, no particular caching.

Available time: Up to say 0.5s per AI unit (they run one at a time).

Note: The route required may extend far beyond the unit's move range, and in principle could extend to a little over half the map.

Pointer size: 2 bytes

# The algorithm

1. Create a blockage-only version of the map in RAM
2. Iteratively step away from both source and destination, marking the reverse route.
3. When they meet, you have the route.

# Expected Performance

For this, in minimal form, a 50x100 grid would need 4b per cell (3b for 8
directions, 1b to indicate that it's just a blockage) so 2500 bytes. You could
have up to 50 cells active at once on each side (unimpeded diagonal line -
impediments can only decrease this number), so 100 active cells requiring just
an address; technically these only require 13b but it's not practical to use
less than 16 each, so 200b for those. That puts the RAM scale at 2700 bytes,
which is eminently usable.

Existing routes count as impediments, which prevents the production of overly
long routes, but results in a noticeable bias.

In the worst case (corner to corner, unimpeded straight line) this will do
5,000+5,000 writes (each cell plus each is a "route head" once) and maybe 20,000
reads (each cell would be read once when empty and thrice when full). Actual CPU
time is negligible. If each read or write is 10 cycles, that's 300,000 cycles of
3,500,000 so about 1/11 of a second.

# Room for improvement

Pragmatic RAM usage is likely to be higher, since you want to know if a target
cell is owned by the current path or its counterpart; there's some wastage here
since blocked cells ignore three bits. The possible states for a cell are:
path1[8] + path2[8] + is_block[1], which is never going to fit comfortably into
a binary number, and there's no dancing around that. For all practical purposes,
there are only 7 possible directions since one of them was the source, but
that's awkward to traverse since you need to examine 1 <= n <= 4 nodes to
determine if the node is +1 or not. If we do have 7+7+1, that would conveniently
enable a final null value to indicate an empty node, perhaps with 0000 as null
and 1000 as blockage. You could save a bit more data (literally, one bit) by
traversing each encountered route when found, but that's going to end up O(n^2)
for reads - far worse than the existing 8n.

In principle the minimum for the worst case for this kind of algorithm would be
on the order of 5,000 writes and 5,000 reads, which is around 1/3 the scale, and
that would be a worthwhile optimisation if possible. Unfortunately the kind of
optimisations which are obvious, eg. don't check if your own previous path point
is available, provide negligible benefit.

For the RAM usage, the optimum case would be 2b per cell - ie, cells are either
"obstruction", "empty" or "path". That would be just 10000b or 1250B;
unfortunately this would require that the whole map is read at least once each
cycle to look for adjacent nodes, which is 5,000 reads *per cycle* and thus
around 750,000 reads in total for the corner-to-corner case.

# Diagonal

The Laser Squad movement system supports diagonal movement at a 6:4 ratio (no
doubt this came from a board game, as 7:5 is much more accurate but harder to
calculate in your head). Where this is the case, actual movement cost becomes a
factor. Fortunately, with the exact values presented here there are exactly
three sets of "times" after a step: +6 (just done a diagonal move); +4 (just
done an orthogonal move, or did a diagonal move 1 step ago); +2 (did a diagonal
move 2 steps ago or an orthogonal move 1 step ago). This makes it relatively
simple to step through, where otherwise we might have to find the minimum
expression of a + b * sqrt(2) in the list. In terms of usage, maintaining three
lists would need two extra pointers (16 + 16 bits, at the time) whereas storing
the offset would need at least two extra bits each, for a maximum of around 100.

In terms of obstruction, only an object in the destination cell blocks; this is
slightly unintuitive since squeezing between a slightly larger gap seems
improbable, but it is easy for a player to understand since the rule is
extremely simple.

# NOTES

Completely traditional pathing would involve moving towards the target until
impeded, then attempting to move around the impediment via right-hand or
left-hand search until the line to the target is clear again. This is extremely
efficient for the straight-line case as it only requires examining n map tiles,
where n is the length of the shortest route - it's the intelligent choice.
Unfortunately, it has many pathological cases for unhelpful obstructions, and in
the common case needs quite computationally expensive shortcuts to be built
between nearest points (including outright path crosses). The RAM usage will be
on the order of half the map size multiplied by the size of an address, although
this can be reduced to the appropriate 2b-3b where doing so helps (note:
dividing a byte into four produces very awkward code). So naive code would
require roughly 5000B on its own, and could be reduced to ~625B in principle.

My favoured pathing algorithm is to take a blocked route and "pull" the whole
path left or right around the blockage until it's clear; unfortunately while
this may be a reasonable approximation of how humans think, it's still of
variable cost and has no particular support for dealing with cases where you
have to start by going backwards. Basically it's garbage for mazes.

Since there's no native malloc involved, all memory is essentially static modulo
manual memory management - in other words, memory structures in general have a
fixed size regardless of whether it might be avantageous in context to use less.
Linked lists are viable and may be used if there's some use in reordering a
list, but in general it makes more sense to have a flat array; in fact, for
static storage this wouldn't even need a head pointer.