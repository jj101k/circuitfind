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

Available time: say 1s for 10 AI units.

Note: The route required may extend far beyond the unit's move range, and in principle could extend to a little over half the map.

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

(or, in fact, 2b for 4 directions at the moment; 3b if diagonal is supported)

Existing routes count as impediments, which prevents the production of overly
long routes, but results in a noticeable bias.

In the worst case (corner to corner, unimpeded straight line) this will do
5,000+5,000 writes (each cell plus each is a "route head" once) and maybe 20,000
reads (each cell would be read once when empty and thrice when full). Actual CPU
time is negligible. If each read or write is 10 cycles, that's 300,000 cycles of
3,500,000 so about 1/11 of a second.

# Room for improvement

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

At the moment this only considers orthogonal movement; if diagonal movement is
supported, the movement cost becomes a factor as does the question of what
constitutes an obstruction.

When moving diagonally, an object in the destination cell will obviously block
movement, but objects in both adjacent cells may also do so, and even an object
in a single adjacent cell might do so. For route collision it would only be
blocked if the exact cell is occupied.

Where cost(d) = 2 * cost(o), ie. diagonal isn't cheaper but looks nicer, more or
less the original route can be used - in fact, if obstruction for diagonal
movement is just "two adjacent cells, or destination" then an orthogonal route
will work fine with simple lookahead to see if skipping the next cell makes
sense.

Where cost(d) = cost(o), you would just do all 8 directions in each pass. This
increases the read cost of course. This makes diagonal movement exceptionally
cheap, but it's helpful if you want diagonal to be preferred where possible.

Where cost(d) = sqrt(2) * cost(o), for some possible approximation like 7/5,
there would have to be a certain amount of complexity to the order, essentially
you'd have to find the minimum of 7 * (d + 1) and 5 * (o + 1) when deciding
which type to try next; you may also step exactly 1 each time and do diagonal
first on the steps where that would be exceeded (ie, !1; 2 >= 1.4; 3 >= 2.8; !4;
5 >= 4.4; 6 >= 5.6; 7 >= 7). These are broadly equivalent and the cost in CPU
time isn't particularly meaningful. This applies equally to bad approximations
like cost(d) = 3/2 * cost(o).

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