/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

(function() {

    if (self.base) return;

    const BASE = self.base = {},
        round_decimal_precision = 8;

    /** ******************************************************************
     * Utility Functions
     ******************************************************************* */

    function time() { return Date.now() }

    function lerp(from, to, maxInc) {
        let dir = Math.sign(to - from);
        let delta = Math.abs(to - from);
        let steps = Math.floor(delta / maxInc);
        let rem = delta % maxInc;
        let per = delta / steps;
        if (rem) {
            steps++;
            per = delta / steps;
        }
        let out = [];
        while (steps-- > 0) {
            from += per * dir;
            out.push(from);
        }
        return out;
    };

    function numOrDefault(num, def) {
        return num !== undefined ? num : def;
    }

    /**
     * call function with all combinations of a1, a2
     * and passing in the supplied arg object.
     *
     * @param {Array} a1
     * @param {Array} a2
     * @param {Object} arg
     * @param {Function} fn
     * @returns {Object}
     */
    function doCombinations(a1, a2, arg, fn) {
        let i, j;
        for (i = 0; i < a1.length; i++) {
            for (j = (a1 === a2 ? i + 1 : 0); j < a2.length; j++) {
                fn(a1[i], a2[j], arg);
            }
        }
        return arg;
    }

    /**
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @returns {boolean}
     */
    function isClockwise(p1, p2, p3) {
        return area2(p1, p2, p3) > 0;
    }

    /**
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @returns {boolean}
     */
    function isCounterClockwise(p1, p2, p3) {
        return area2(p1, p2, p3) < 0;
    }

    /**
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @returns {boolean}
     */
    function isCollinear(p1, p2, p3) {
        return inCloseRange(area2(p1, p2, p3), -0.00001, 0.00001);
    }

    function pac(p1, p2) {
        return (p2.x - p1.x) * (p2.y + p1.y);
    }

    /**
     * returns 2x area for a triangle with sign indicating handedness
     *
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @returns {number} negative for CCW progression, positive for CW progression
     */
    function area2(p1, p2, p3) {
        return pac(p1,p2) + pac(p2,p3) + pac(p3,p1);
    }

    /**
     *
     * @param v1
     * @param v2
     * @param [dist]
     * @returns {boolean}
     */
    function isCloseTo(v1,v2,dist) {
        return Math.abs(v1-v2) <= (dist || BASE.config.precision_merge);
    }

    /**
     *
     * @param val
     * @param min
     * @param max
     * @returns {boolean}
     */
    function inCloseRange(val, min, max) {
        return (isCloseTo(val,min) || val >= min) && (isCloseTo(val,max) || val <= max);
    }

    /**
     * return square of value
     * @param v
     * @returns {number}
     */
    function sqr(v) { return v * v }

    /**
     * return distance squared between two points
     * @param p1
     * @param p2
     * @returns {number}
     */
    function dist2(p1,p2) { return sqr(p2.x - p1.x) + sqr(p2.y - p1.y) }

    /**
     * return distance squared between two points
     * enables faster Point.nearPolygon()
     *
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @returns {number}
     */
    function dist2v2(x1,y1,x2,y2) { return sqr(x2 - x1) + sqr(y2 - y1) }

    /**
     *
     * @param offset
     * @param precision
     * @returns {number}
     */
    function offsetPrecision(offset, precision) {
        return Math.abs(offset) - precision;
    }

    /**
     *
     * @param value
     * @param min
     * @param max
     * @returns {boolean}
     */
    function inRange(value, min, max) {
        let val = parseFloat(value);
        return val >= min && val <= max;
    }

    /**
     *
     * @param v
     * @param zeros
     * @returns {number}
     */
    function round(v, zeros) {
        let pow = Math.pow(10,zeros || round_decimal_precision);
        return Math.round(v * pow) / pow;
    }

    /**
     * used by {@link Polygon.trace} and {@link Polygon.intersect}
     *
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @param {Point} p4
     * @param {String} [test]
     * @param {boolean} [parallelok]
     * @returns {?Point | String}
     */
    function intersect(p1, p2, p3, p4, test, parallelok) {
        let keys = BASE.key,
            p1x = p1.x,
            p1y = p1.y,
            p2x = p2.x,
            p2y = p2.y,
            p3x = p3.x,
            p3y = p3.y,
            p4x = p4.x,
            p4y = p4.y,
            d1x = (p2x - p1x), // ad.x
            d1y = (p2y - p1y), // ad.y
            d2x = (p4x - p3x), // bd.x
            d2y = (p4y - p3y), // bd.y
            d = (d2y * d1x) - (d2x * d1y); // det

        //if (Math.abs(d) < 0.0000000001) {
        if (Math.abs(d) < 0.0001) {
            // lines are parallel or collinear
            return test && !parallelok ? null : keys.PARALLEL;
        }

        let a = p1y - p3y, // origin dy
            b = p1x - p3x, // origin dx
            n1 = (d2x * a) - (d2y * b),
            n2 = (d1x * a) - (d1y * b);

        a = n1 / d; // roughly distance from l1 origin to l2 intersection
        b = n2 / d; // roughly distance from l2 origin to l1 intersection

        let ia = a >= -0.0001 && a <= 1.0001,
            ib = b >= -0.0001 && b <= 1.0001,
            segint = (ia && ib),
            rayint = (a >= 0 && b >= 0);

        if (test === keys.SEGINT && !segint) return null;
        if (test === keys.RAYINT && !rayint) return null;

        let ip = BASE.newPoint(
            p1x + (a * d1x), // x
            p1y + (a * d1y), // y
            p3.z || p4.z,    // z
            segint ? keys.SEGINT : rayint ? keys.RAYINT : keys.PROJECT
        );

        ip.dist = a;
        ip.p1 = p3;
        ip.p2 = p4;

        return ip;
    }

    /**
     * used by {@link rayIntersect} and {@link Polygon.trace}
     *
     * @param {Point} ro
     * @param {Slope} s1
     * @param {Point} p1
     * @param {Point} p2
     * @param {boolean} [infinite]
     * @returns {?Point}
     */
    function intersectRayLine(ro, s1, p1, p2, infinite) {
        let keys = BASE.key,
            p1x = ro.x,
            p1y = ro.y,
            s1x = s1.dx,
            s1y = s1.dy,
            p3x = p1.x,
            p3y = p1.y,
            p4x = p2.x,
            p4y = p2.y,
            s2x = p4x - p3x,
            s2y = p4y - p3y,
            d = (s2y * s1x) - (s2x * s1y);

        let a = p1y - p3y,
            b = p1x - p3x,
            n1 = (s2x * a) - (s2y * b),
            n2 = (s1x * a) - (s1y * b);

        if (Math.abs(d) < 0.000000000001) {
            // lines are parallel or collinear
            return null;
        }

        a = n1 / d;
        b = n2 / d;

        if (infinite || (inCloseRange(b,0,1) && a >= 0)) {
            let ip = BASE.newPoint(
                p1x + (a * s1x),
                p1y + (a * s1y),
                p2.z || ro.z,
                keys.NONE
            );
            ip.dist = a;
            ip.p1 = p1;
            ip.p2 = p2;
            return ip;
        }
        return null;
    }

    /**
     * @param {Point} p1
     * @param {Point} p2
     * @param {Point} p3
     * @param {Point} p4
     * @returns {number}
     */
    function determinant(p1, p2, p3, p4) {
        let d1x = (p2.x - p1.x),
            d1y = (p2.y - p1.y),
            d2x = (p4.x - p3.x),
            d2y = (p4.y - p3.y);

        return (d2y * d1x) - (d2x * d1y);
    }

    /**
     * return circle center given three points
     * from https://math.stackexchange.com/questions/1076177/3d-coordinates-of-circle-center-given-three-point-on-the-circle
     */
    function center3d(a,b,c) {
        let ax = a.x,
            ay = a.y,
            az = a.z || 0,
            bx = b.x,
            by = b.y,
            bz = b.z || 0,
            cx = c.x,
            cy = c.y,
            cz = c.z || 0,
            Cx = bx-ax,
            Cy = by-ay,
            Cz = bz-az,
            Bx = cx-ax,
            By = cy-ay,
            Bz = cz-az,
            B2 = (ax*ax)-(cx*cx)+(ay*ay)-(cy*cy)+(az*az)-(cz*cz),
            C2 = (ax*ax)-(bx*bx)+(ay*ay)-(by*by)+(az*az)-(bz*bz),
            CByz = Cy*Bz-Cz*By,
            CBxz = Cx*Bz-Cz*Bx,
            CBxy = Cx*By-Cy*Bx,
            ZZ1 = -(Bz-Cz*Bx/Cx)/(By-Cy*Bx/Cx),
            Z01 = -(B2-Bx/Cx*C2)/(2*(By-Cy*Bx/Cx)),
            ZZ2 = -(ZZ1*Cy+Cz)/Cx,
            Z02 = -(2*Z01*Cy+C2)/(2*Cx),
            dz = -((Z02-ax)*CByz-(Z01-ay)*CBxz-az*CBxy)/(ZZ2*CByz-ZZ1*CBxz+CBxy),
            dx = ZZ2*dz + Z02,
            dy = ZZ1*dz + Z01;

        return {x:dx, y:dy, z:dz};
    }

    /**
     * return circle center given three points
     * from https://stackoverflow.com/questions/4103405/what-is-the-algorithm-for-finding-the-center-of-a-circle-from-three-points
     */
    function center2d(A,B,C) {
        let yDelta_a = B.y - A.y,
            xDelta_a = B.x - A.x,
            yDelta_b = C.y - B.y,
            xDelta_b = C.x - B.x,
            aSlope = yDelta_a/xDelta_a,
            bSlope = yDelta_b/xDelta_b,
            center = {x:0, y:0, z:0};
        center.x = (aSlope*bSlope*(A.y - C.y) + bSlope*(A.x + B.x) - aSlope*(B.x+C.x) )/(2* (bSlope-aSlope) );
        center.y = -1*(center.x - (A.x+B.x)/2)/aSlope +  (A.y+B.y)/2;

        return center;
    }

    /** ******************************************************************
     * Connect to base
     ******************************************************************* */

    BASE.key = {
        NONE : "",
        PROJECT : "project",
        SEGINT : "segint",
        RAYINT : "rayint",
        PARALLEL : "parallel"
    };

    BASE.config = {
        // size of gcode debug arrow head
        debug_arrow : 0.25,
        // default # of decimal places in generated gcode
        gcode_decimals : 4,
        // heal disjoint polygons in slicing (experimental)
        bridgeLineGapDistance : 0.0001,
        // Bounds default margin nearTo
        // Polygon.offset mindist2 offset precision
        precision_offset : 0.05,
        // Polygon.isEquivalent area() isCloseTo
        precision_poly_area : 0.05,
        // Polygon.isEquivalent bounds() equals value
        precision_poly_bounds: 0.01,
        // Polygon.isEquivalent point distance to other poly line
        precision_poly_merge: 0.05,
        // Polygon.traceIntersects mindist2
        // Polygon.overlaps (bounds overlaps test precision)
        // Polygon.isEquivalent circularity (is circle if 1-this < merge)
        // Slope.isSame (vert/horiz w/in this value)
        // isCloseTo() default for dist
        // sliceIntersects point merge dist for non-fill
        precision_merge : 0.005,
        precision_slice_z : 0.0001,
        // Point.isInPolygon nearPolygon value
        // Point.isInPolygonNotNear nearPolygon value
        // Point.isMergable2D distToSq2D value
        // Point.isMergable3D distToSq2D value
        // Polygon.isInside nearPolygon value
        // Polygon.isOutside nearPolygon value
        precision_merge_sq : sqr(0.005),
        // Bound.isNested inflation value for potential parent
        precision_bounds : 0.0001,
        // Slope.isSame default precision
        precision_slope : 0.02,
        // Slope.isSame use to calculate precision
        precision_slope_merge : 0.25,
        // sliceIntersect point merge distance for fill
        precision_fill_merge : 0.001,
        // convertPoints point merge distance
        // other values break cube-s9 (wtf)
        precision_decimate : 0.05,
        // decimate test over this many points
        decimate_threshold : 500000,
        // Point.onLine precision distance (endpoints in Polygon.intersect)
        precision_point_on_line : 0.01,
        // Polygon.isEquivalent value for determining similar enough to test
        precision_circularity : 0.001,
        // polygon fill hinting (settings override)
        hint_len_min : sqr(3),
        hint_len_max : sqr(20),
        hint_min_circ : 0.15,
        // tolerances to determine if a point is near a masking polygon
        precision_mask_tolerance : 0.001,
        // Polygon isInside,isOutside tolerance (accounts for midpoint skew)
        precision_close_to_poly_sq : sqr(0.001),
        // how long a segment has to be to trigger a midpoint check (inner/outer)
        precision_midpoint_check_dist : 1,
        precision_nested_sq : sqr(0.01),
        // clipper multiplier
        clipper : 100000,
        // clipper poly clean
        clipperClean : 250
    };

    BASE.util = {
        sqr,
        lerp,
        time,
        round,
        area2,
        center2d,
        center3d,
        distSq : dist2,
        distSqv2 : dist2v2,
        inRange,
        isCloseTo,
        inCloseRange,
        isCollinear,
        isClockwise,
        isCounterClockwise,
        doCombinations,
        offsetPrecision,
        intersectRayLine,
        intersect,
        determinant,
        numOrDefault,
        comma: (v) => {
            if (!v) return v;
            let [lt,rt] = v.toString().split('.');
            lt = lt.toString().split('').reverse().map((v,i,a) => {
                return (i < a.length - 1 && i % 3 === 2) ? `,${v}` : v
            }).reverse().join('');
            return rt ? `${lt}.${rt}` : lt;
        }
    };

})();
