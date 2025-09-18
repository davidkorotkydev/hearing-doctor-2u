/*
    # Author's note #

    Don't be afraid! This file is a stylistic experiment and completely different from the rest of the project. Our goal here is to reduce the number and size of heap allocations to a minimum. Almost everything is allocated at the start and mutated in place thereafter. We prefer more data when it allows $O(1)$ lookup later. We do not attempt to optimize strings. Functions and variables following this style are written in snake case.
*/

import { AfterViewInit, Component, inject, input } from "@angular/core";

import { BreakpointObserver, LayoutModule } from "@angular/cdk/layout";

/* # Types # */

/* An `Index` is a `grid` coordinate, not a `Point` value stored in `grid`. TypeScript keeps this from becoming too confusing. Additionally, we use a naming convention where names for "real" values for (or from) a `Point` start with `$`. */
type Index = {
    x: number;
    y: number;
};

type Point = {
    x: number;
    y: number;
    /* * */
    can_pass: boolean;
    has_block: boolean;
    is_removed: boolean;
    /* The fields below are only utilized in the trip search stage. For example `in_fringe` corresponds to whether or not the `Index` of `x` and `y` is currently in the `fringe` priority queue. We do it this way because searching through the priority queue is $O(n)$ (where $n$ roughly corresponds to path length), while looking up the value in `grid` is $O(1)$. */
    f: number;
    g: number;
    /* * */
    from_x: number;
    from_y: number;
    /* * */
    in_fringe: boolean;
};

/* # Allocations # */

const X = 31;
const Y = 13;

const FADE = 500;

const grid: Point[][] = (function () {
    const array = new Array(X);

    for (let x = 0; x < X; x++) {
        const column = new Array(Y);

        for (let y = 0; y < Y; y++) {
            const point: Point = {
                x,
                y,
                can_pass: false,
                has_block: false,
                is_removed: false,
                f: Infinity,
                g: Infinity,
                from_x: -1,
                from_y: -1,
                in_fringe: false,
            };

            column[y] = point;
        }

        array[x] = column;
    }

    return array;
})();

/* These are typed buffers. */

// const x_booleans: boolean[] = new Array(X).fill(false);
// const y_booleans: boolean[] = new Array(Y).fill(false);

// const $x_numbers: number[] = new Array(X).fill(0);
// const $y_numbers: number[] = new Array(Y).fill(0);

const probability: { [key: string]: number } = {
    green: 0.14,
    store: 0.02,
    water: 0.02,
};

const greens = allocate_indexes(Math.ceil(2 * X * Y * probability["green"]));
const stores = allocate_indexes(Math.ceil(2 * X * Y * probability["store"]));
const waters = allocate_indexes(Math.ceil(2 * X * Y * probability["water"]));

const cumulative_intervals = (function () {
    const object: { [key: string]: { start: number; end: number } } = {};
    let sum = 0;

    /* Keys appear to be traversed in lexicographic order. */
    for (let key in probability) {
        if (sum >= 1) {
            object[key] = { start: -1, end: -1 };
            continue;
        }

        const start = sum;
        sum += probability[key];
        if (sum > 1) sum = 1;
        const end = sum;
        object[key] = { start, end };
    }

    return object;
})();

const breadcrumbs = allocate_indexes(Math.max(X, Y));

const bound = {
    goal: { bottom: 1, left: 8, right: 8, top: 1 },
    text: { bottom: 4, left: 11, right: 11, top: 4 },
    trip: { bottom: 1, left: 8, right: 8, top: 1 },
};

/*
    We assume

    1. the bounds above are for the "largest" media query match, and
    2. all other matches that trigger changing bounds change them so that their resultant areas are not greater than what is allocated below.
*/
const text_x = Math.max(0, X - bound.text.left - bound.text.right);
const text_y = Math.max(0, Y - bound.text.top - bound.text.bottom);
const goal_area = Math.max(0, X - 1 - bound.goal.left - bound.goal.right) * Math.max(0, Y - 1 - bound.goal.top - bound.goal.bottom) - (text_x + 1) * (text_y + 1);
const trip_area = Math.max(0, X - bound.trip.left - bound.trip.right) * Math.max(0, Y - bound.trip.top - bound.trip.bottom) - text_x * text_y;

const goal_zone = allocate_indexes(goal_area);
const trip = allocate_indexes(trip_area);

const source: Index = { x: 0, y: 0 };
const $house = { x: 0, y: 0 };

// prettier-ignore
const directions = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];

const current: Index = { x: 0, y: 0 };
const neighbor: Index = { x: 0, y: 0 };

const fringe = new (class Heap {
    count = 0;
    private maximum = trip_area;
    private items = allocate_indexes(this.maximum);

    /** Spookily, this mutates `current` and `grid` if successful. */
    dequeue(): true | null {
        if (this.count === 0) return null;
        current.x = this.items[0].x;
        current.y = this.items[0].y;
        /* `current` now holds the "return" value. */
        grid[current.x][current.y].in_fringe = false;
        this.count--;
        this.items[0].x = this.items[this.count].x;
        this.items[0].y = this.items[this.count].y;
        this.heapify_down(0);
        return true;
    }

    enqueue(value: Index): true | null {
        if (this.count === this.maximum) return null;
        this.items[this.count].x = value.x;
        this.items[this.count].y = value.y;
        this.count++;
        grid[value.x][value.y].in_fringe = true;
        this.heapify_up(this.count - 1);
        return true;
    }

    peek(): true | null {
        if (this.count === 0) return null;
        current.x = this.items[0].x;
        current.y = this.items[0].y;
        return true;
    }

    score(i: number): number {
        return grid[this.items[i].x][this.items[i].y].f;
    }

    private heapify_down(i: number) {
        let left = 2 * i + 1;
        let right = 2 * i + 2;
        let smallest = i;

        while (true) {
            if (left < this.count && this.score(left) < this.score(smallest)) smallest = left;
            if (right < this.count && this.score(right) < this.score(smallest)) smallest = right;

            if (smallest !== i) {
                in_place_swap(this.items[i], this.items[smallest]);
                i = smallest;
                left = 2 * smallest + 1;
                right = 2 * smallest + 2;
                continue;
            }

            return;
        }
    }

    private heapify_up(i: number) {
        while (true) {
            if (i === 0) return;
            const parent = Math.floor((i - 1) / 2);

            if (this.score(parent) > this.score(i)) {
                in_place_swap(this.items[parent], this.items[i]);
                i = Math.floor((i - 1) / 2);
                continue;
            }

            return;
        }
    }
})();

/* Warning: these indices keep track of array bounds. */

const count = {
    goal: 0,
    trip: 0,
    /* * */
    green: 0,
    store: 0,
    water: 0,
};

const breakpoints = [
    /* Our breakpoints should match those set in `styles.css`. */
    /* `lg` */
    "(69rem <= width)",
];

/* # Utilities # */

/* Using the `fill` method on `Array.prototype` with a dummy object fills the array with references to a single instance of the object. We do not want this since we mutate in place instead of replacing objects each time. */
function allocate_indexes(length: number): Index[] {
    const array = new Array(length);

    for (let i = 0; i < length; i++) {
        const index: Index = { x: 0, y: 0 };
        array[i] = index;
    }

    return array;
}

function coin_toss(tosses: boolean[]) {
    for (let i = 0; i < tosses.length; i++) tosses[i] = Math.random() < 0.5;
    return tosses;
}

/** "heuristic" */
function h(a: Index, b: Index) {
    // return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    return Math.abs(a.x - (b.x - 0.5));
}

function in_place(index: Index, x: number, y: number, transpose = false) {
    index.x = transpose ? y : x;
    index.y = transpose ? x : y;
}

function in_place_swap(a: Index, b: Index) {
    const x = a.x;
    const y = a.y;
    a.x = b.x;
    a.y = b.y;
    b.x = x;
    b.y = y;
}

function reset() {
    for (let x = 0; x < X; x++) {
        for (let y = 0; y < Y; y++) {
            grid[x][y].x = x;
            grid[x][y].y = y;
            grid[x][y].can_pass = false;
            grid[x][y].has_block = false;
            grid[x][y].is_removed = false;
            /* * */
            grid[x][y].f = Infinity;
            grid[x][y].g = Infinity;
            grid[x][y].from_x = -1;
            grid[x][y].from_y = -1;
            grid[x][y].in_fringe = false;
        }
    }

    count.green = 0;
    count.store = 0;
    count.water = 0;
    /* * */
    count.goal = 0;
    count.trip = 0;
    fringe.count = 0;
}

function reset_trip() {
    for (let x = bound.trip.left; x < X - bound.trip.right; x++) {
        for (let y = bound.trip.top; y < Y - bound.trip.bottom; y++) {
            grid[x][y].f = Infinity;
            grid[x][y].g = Infinity;
            grid[x][y].from_x = -1;
            grid[x][y].from_y = -1;
            grid[x][y].in_fringe = false;
        }
    }

    count.goal = 0;
    count.trip = 0;
    fringe.count = 0;
}

function skewed_distribution(power = 3) {
    return Math.pow(Math.random(), power);
}

/* # Stages # */

// function shift_parallel_regions($shifts: number[], regions: boolean[], maximum_shift = 0.8) {
//     if ($shifts.length !== regions.length) return;
//     let $shift = 0;

//     for (let i = 0; i < regions.length; i++) {
//         if (regions[i] && (!i || !regions[i - 1])) $shift = maximum_shift * (skewed_distribution() - 0.5);
//         $shifts[i] = $shift;
//     }
// }

// function shift_regions() {
//     coin_toss(x_booleans);

//     for (let x = 1; x < X - 1; x++) {
//         if (x_booleans[x] && !x_booleans[x - 1]) shift_parallel_regions($y_numbers, coin_toss(y_booleans));
//         for (let y = 0; y < Y; y++) grid[x][y].x += $y_numbers[y];
//     }

//     for (let y = 1; y < Y - 1; y++) {
//         if (y_booleans[y] && !y_booleans[y - 1]) shift_parallel_regions($x_numbers, coin_toss(x_booleans));
//         for (let x = 0; x < X; x++) grid[x][y].y += $x_numbers[x];
//     }
// }

function occupy_blocks() {
    const c = cumulative_intervals;

    for (let x = 1; x < X; x++) {
        for (let y = 1; y < Y; y++) {
            if (bound.text.left <= x && x <= X - bound.text.right && bound.text.top <= y && y <= Y - bound.text.bottom) continue;
            const r = Math.random();
            let has_block = false;

            // prettier-ignore
            if (false) {}
            else if (c["green"].start <= r && r < c["green"].end) { if (count.green < greens.length) { in_place(greens[count.green++], x, y); has_block = true; } }
            else if (c["store"].start <= r && r < c["store"].end) { if (count.store < stores.length) { in_place(stores[count.store++], x, y); has_block = true; } }
            else if (c["water"].start <= r && r < c["water"].end) { if (count.water < waters.length) { in_place(waters[count.water++], x, y); has_block = true; } }

            grid[x][y].has_block = has_block;
        }
    }
}

function remove_points(probability = 0.2) {
    for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) if (Math.random() < probability) grid[x][y].is_removed = true;
    for (let x = bound.text.left; x < X - bound.text.right; x++) for (let y = bound.text.top; y < Y - bound.text.bottom; y++) grid[x][y].is_removed = true;
}

function assess_zones() {
    for (let x = bound.trip.left; x < X - bound.trip.right; x++) {
        for (let y = bound.trip.top; y < Y - bound.trip.bottom; y++) {
            if (grid[x][y].is_removed) continue;
            grid[x][y].can_pass = true;
            if (grid[x][y].has_block) continue;
            if (!(bound.goal.left < x && x < X - bound.goal.right && bound.goal.top < y && y < Y - bound.goal.bottom)) continue;
            if (bound.text.left <= x && x <= X - bound.text.right && bound.text.top <= y && y <= Y - bound.text.bottom) continue;
            // const $ = grid[x][y];
            // const $left = grid[x - 1][y];
            // const $top_left = grid[x - 1][y - 1];
            // const $top = grid[x][y - 1];
            // /* The block is ... */
            // if (Math.abs($left.x - $.x) < 1 || $left.y !== $.y) continue; /* ... too narrow or uneven. */
            // if (Math.abs($top_left.x - $left.x) > 0.1 || Math.abs($top.x - $.x) > 0.1) continue; /* ... too skewed. */
            // if (Math.abs($top_left.y - $left.y) < 0.9 || Math.abs($top.y - $.y) < 0.9) continue; /* ... too short. */
            // /* ... just right. */
            if (count.goal < goal_zone.length) in_place(goal_zone[count.goal++], x, y);
        }
    }
}

@Component({
    imports: [LayoutModule],
    selector: "app-hero-animation",
    template: `
        <svg [attr.viewBox]="viewBox" [class]="svgClass()" id="hero-animation" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="left-fade">
                    <stop offset="0%" stop-color="var(--background-color)" stop-opacity="1" />
                    <stop offset="20%" stop-color="var(--background-color)" stop-opacity="0" />
                </linearGradient>
                <linearGradient id="right-fade">
                    <stop offset="80%" stop-color="var(--background-color)" stop-opacity="0" />
                    <stop offset="100%" stop-color="var(--background-color)" stop-opacity="1" />
                </linearGradient>
            </defs>
            <g id="maps"></g>
        </svg>
    `,
})
export class HeroAnimation implements AfterViewInit {
    svgClass = input<string | undefined>();
    private observer = inject(BreakpointObserver);
    protected viewBox = `0 0 ${X - 1} ${Y - 1}`;

    ngAfterViewInit() {
        /* "The performance benefit of `DocumentFragment` is often overstated" [[.](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)]. */
        const fragment = document.createDocumentFragment();
        const maps = document.getElementById("maps");
        if (!maps) return;
        let mount_id = 0;
        let unmount_id = 0;

        function render_path(d: string, class_name: string) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", class_name);
            path.setAttribute("d", d);
            fragment.appendChild(path);
        }

        function render_backdrop() {
            const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rectangle.setAttribute("class", "backdrop");
            fragment.appendChild(rectangle);
        }

        function render_block(bottom_right: Index, class_name: string) {
            const { x, y } = bottom_right;

            /* Draw clockwise from the bottom right. */
            const d =
                `M${grid[x][y].x},${grid[x][y].y}` + //
                `L${grid[x - 1][y].x},${grid[x - 1][y].y}` +
                `L${grid[x - 1][y - 1].x},${grid[x - 1][y - 1].y}` +
                `L${grid[x][y - 1].x},${grid[x][y - 1].y}Z`;

            render_path(d, class_name);
        }

        function render_road(indexes: Index[], count: number, transpose: boolean) {
            let d = "";
            /* A stray road has no neighbors and does not touch an edge. We do not render stray roads. Our method cannot detect intersecting stray roads. These are extremely rare at 20% removal probability. */
            let stray = true;

            for (let i = 0; i < count; i++) {
                const { x, y } = indexes[i];
                const $ = grid[x][y];
                d += !i ? `M${$.x},${$.y}` : `L${$.x},${$.y}`;

                if (transpose) {
                    if (!grid[x][y - 1].is_removed || !grid[x][y + 1].is_removed || x === 0 || x === X - 1) stray = false;
                } else {
                    if (!grid[x - 1][y].is_removed || !grid[x + 1][y].is_removed || y === 0 || y === Y - 1) stray = false;
                }
            }

            if (!stray) render_path(d, "road");
            // else render_path(d, "developer__stray");
        }

        function render_parallel_roads(transpose = false) {
            const i_max = transpose ? Y : X;
            const j_max = transpose ? X : Y;

            for (let i = 1; i < i_max - 1; i++) {
                for (let count = 0, j = 0; ; j++) {
                    if (j === j_max) {
                        render_road(breadcrumbs, count, transpose);
                        break;
                    }

                    const is_removed = (transpose ? grid[j][i] : grid[i][j]).is_removed;

                    if (!count) {
                        /* Do not increment `count` here. */
                        if (is_removed) continue;
                        in_place(breadcrumbs[count++], i, j, transpose);
                        continue;
                    }

                    if (is_removed) {
                        render_road(breadcrumbs, count, transpose);
                        count = 0;
                        continue;
                    }

                    in_place(breadcrumbs[count++], i, j, transpose);
                }
            }
        }

        function render_roads() {
            render_parallel_roads();
            render_parallel_roads(true);
        }

        function render_trip(d: string, INVERSE_SPEED = 150) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("class", "trip");
            path.setAttribute("d", d);
            const length = path.getTotalLength();
            const duration = length * INVERSE_SPEED;
            path.style.setProperty("--duration", `${duration}ms`);
            path.style.setProperty("--length", `${length}`);
            fragment.appendChild(path);
            return duration;
        }

        function render_circle($x: number, $y: number, class_name: string) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("class", class_name);
            circle.setAttribute("cx", `${$x}`);
            circle.setAttribute("cy", `${$y}`);
            fragment.appendChild(circle);
        }

        function render_source() {
            const $ = grid[source.x][source.y];
            render_circle($.x, $.y, "source-ripple");
            render_circle($.x, $.y, "source");
        }

        function render_house($x: number, $y: number, SCALE = 0.15) {
            const s = SCALE;

            /* Draw clockwise from the bottom midpoint. */
            const d =
                `M${$x},${$y}` + //
                `l${-2 * s},0` +
                `l0,${-3 * s}` +
                `l${2 * s},${-1 * s}` +
                `l${2 * s},${1 * s}` +
                `l0,${3 * s}Z`;

            render_path(d, "house");
        }

        function render_edges() {
            const left = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            left.setAttribute("class", "left-edge");
            left.setAttribute("fill", "url(#left-fade)");
            fragment.appendChild(left);
            const right = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            right.setAttribute("class", "right-edge");
            right.setAttribute("fill", "url(#right-fade)");
            fragment.appendChild(right);
        }

        function render_fade(duration: number) {
            const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rectangle.setAttribute("class", "fade");
            rectangle.style.setProperty("--duration", `${FADE + duration + FADE}ms`);
            fragment.appendChild(rectangle);
        }

        const developer = {
            render_zones() {
                for (let x = bound.trip.left; x < X - bound.trip.right; x++) {
                    for (let y = bound.trip.top; y < Y - bound.trip.bottom; y++) {
                        const $ = grid[x][y];
                        if ($.can_pass) render_circle($.x, $.y, "developer__trip");
                    }
                }

                for (let i = 0; i < count.goal; i++) {
                    const { x, y } = goal_zone[i];
                    const $ = grid[x][y];
                    const $left = grid[x - 1][y];
                    render_path(`M${$.x},${$.y}L${$left.x},${$left.y}`, "developer__goal");
                    render_circle($.x, $.y, "developer__goal");
                    render_circle($left.x, $left.y, "developer__goal");
                }
            },
        };

        function render_map(id = 1, $PORCH = 0.2, MAX_ATTEMPTS = 10, MIN_DISTANCE = 4) {
            let d: string;

            new_terrain: while (true) {
                // shift_regions();
                occupy_blocks();
                remove_points();
                assess_zones();

                new_goal: for (let attempt = 0; ; attempt++) {
                    if (attempt === MAX_ATTEMPTS) {
                        reset();
                        continue new_terrain;
                    }

                    const goal = goal_zone[Math.floor(Math.random() * count.goal)];
                    const $goal = grid[goal.x][goal.y];
                    const $goal_left = grid[goal.x - 1][goal.y];
                    $house.x = $goal.x - ($goal.x - $goal_left.x) / 2;
                    $house.y = $goal.y - $PORCH;

                    do {
                        source.x = Math.floor(Math.random() * (X - bound.trip.right - bound.trip.left)) + bound.trip.left;
                        source.y = Math.floor(Math.random() * (Y - bound.trip.bottom - bound.trip.top)) + bound.trip.top;
                    } while (!grid[source.x][source.y].can_pass || Math.abs(source.x - goal.x) < MIN_DISTANCE || Math.abs(source.y - goal.y) < MIN_DISTANCE);

                    grid[source.x][source.y].f = h(source, goal);
                    grid[source.x][source.y].g = 0;
                    fringe.enqueue(source);

                    while (fringe.count > 0) {
                        fringe.dequeue();

                        if ((current.x === goal.x || current.x === goal.x - 1) && current.y === goal.y) {
                            while (current.x !== -1) {
                                const x = current.x;
                                const y = current.y;
                                in_place(trip[count.trip++], x, y);
                                current.x = grid[x][y].from_x;
                                current.y = grid[x][y].from_y;
                            }

                            break;
                        }

                        for (let i = 0; i < directions.length; i++) {
                            neighbor.x = current.x + directions[i].x;
                            neighbor.y = current.y + directions[i].y;
                            if (!grid[neighbor.x][neighbor.y].can_pass) continue;
                            const g = grid[current.x][current.y].g + 1;

                            if (g < grid[neighbor.x][neighbor.y].g) {
                                grid[neighbor.x][neighbor.y].from_x = current.x;
                                grid[neighbor.x][neighbor.y].from_y = current.y;
                                grid[neighbor.x][neighbor.y].f = g + h(neighbor, goal);
                                grid[neighbor.x][neighbor.y].g = g;
                                if (!grid[neighbor.x][neighbor.y].in_fringe) fringe.enqueue(neighbor);
                            }
                        }
                    }

                    if (count.trip === 0) {
                        reset_trip();
                        continue new_goal;
                    }

                    break;
                }

                /* `d` is initialized (or reassigned) here. */
                d = `M${grid[source.x][source.y].x},${grid[source.x][source.y].y}`;

                for (let i = count.trip - 1; i >= 0; i--) {
                    const { x, y } = trip[i];
                    const $ = grid[x][y];
                    d += `L${$.x},${$.y}`;
                }

                /* Overlap the house a little. Floating-point errors can cause the path animation to be slightly off. */
                d +=
                    `L${$house.x},${$house.y + $PORCH}` + //
                    `L${$house.x},${$house.y - 0.1}`;

                break;
            }

            render_backdrop();
            for (let i = 0; i < count.green; i++) render_block(greens[i], "green");
            for (let i = 0; i < count.store; i++) render_block(stores[i], "store");
            for (let i = 0; i < count.water; i++) render_block(waters[i], "water");
            render_roads();
            const duration = render_trip(d);
            render_source();
            render_house($house.x, $house.y);
            render_edges();
            render_fade(duration);
            // developer.render_zones();
            return duration;
        }

        function mount_map(duration: number, id: number, OVERLAP = 100) {
            const group_id = `map-${id}`;
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("id", group_id);
            group.appendChild(fragment);
            maps!.appendChild(group);

            unmount_id = setTimeout(
                function () {
                    const child = document.getElementById(group_id);
                    if (child) maps!.removeChild(child);
                },
                FADE + duration + FADE + OVERLAP,
            );

            return id + 1;
        }

        // let total_time = 0;

        function loop(duration: number, id = 1) {
            // const time = performance.now();

            /* Immediately mount the _current_ render which will unmount after the _current_ duration. */
            const next_id = mount_map(duration, id);
            reset();
            /* Immediately render the next map. */
            const next_duration = render_map(next_id);

            mount_id = setTimeout(
                function () {
                    loop(next_duration, next_id);
                },
                /* Wait the _current_ duration to mount the _next_ map. */
                FADE + duration + FADE,
            );

            // const loop_time = performance.now() - time;
            // total_time += loop_time;
            // console.log(id, loop_time, total_time / id);
        }

        this.observer.observe(breakpoints).subscribe((value) => {
            if (value.breakpoints[breakpoints[0]]) {
                maps.textContent = "";
                clearTimeout(mount_id);
                clearTimeout(unmount_id);
                bound.goal.left = 8;
                bound.goal.right = 8;
                bound.trip.left = 8;
                bound.trip.right = 8;
                reset();
                loop(render_map());
            } else {
                maps.textContent = "";
                clearTimeout(mount_id);
                clearTimeout(unmount_id);
                bound.goal.left = 10;
                bound.goal.right = 10;
                bound.trip.left = 10;
                bound.trip.right = 10;
                reset();
                loop(render_map());
            }
        });
    }
}
