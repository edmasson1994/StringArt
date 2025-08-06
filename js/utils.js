function colorDistance(c1, c2) {
    const dr = c1[0] - c2[0];
    const dg = c1[1] - c2[1];
    const db = c1[2] - c2[2];
    return Math.sqrt(dr*dr + dg*dg + db*db);
}

function kMeans(pixels, k, initMethod = 'random') {
    if (pixels.length < k) {
        return pixels.map(p => ({ centroid: p, size: 1 }));
    }
    
    // Initialize centroids using the specified method
    let centroids = (initMethod === 'kmeans++')
        ? initializeCentroidsKMeansPlusPlus(pixels, k)
        : initializeCentroidsRandom(pixels, k);

    const MAX_ITERATIONS = 20;
    let clusters;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        clusters = Array.from({ length: k }, () => []);
        
        // Assign each pixel to the closest centroid
        for (const pixel of pixels) {
            let minDist = Infinity;
            let bestCentroidIdx = 0;
            for (let i = 0; i < k; i++) {
                const dist = colorDistance(pixel, centroids[i]);
                if (dist < minDist) {
                    minDist = dist;
                    bestCentroidIdx = i;
                }
            }
            clusters[bestCentroidIdx].push(pixel);
        }

        let hasChanged = false;
        // Recalculate centroids based on the new clusters
        for (let i = 0; i < k; i++) {
            if (clusters[i].length === 0) {
                 // If a cluster becomes empty, re-seed it with a random pixel
                 // to prevent the algorithm from getting stuck.
                 if (pixels.length > 0) {
                    const idx = Math.floor(Math.random() * pixels.length);
                    centroids[i] = [...pixels[idx]];
                    hasChanged = true;
                 }
                 continue;
            }

            const sum = clusters[i].reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
            // Keep centroids as floats for precision during iterations
            const newCentroid = [
                sum[0] / clusters[i].length,
                sum[1] / clusters[i].length,
                sum[2] / clusters[i].length
            ];

            if (colorDistance(newCentroid, centroids[i]) > 1) { // Check for meaningful change
                hasChanged = true;
            }
            centroids[i] = newCentroid;
        }

        if (!hasChanged) break; // Converged
    }

    // Return the final centroids and the size of each cluster
    return centroids.map((centroid, i) => ({
        centroid,
        size: clusters[i] ? clusters[i].length : 0
    }));
}

function initializeCentroidsRandom(pixels, k) {
    const centroids = [];
    const usedIndices = new Set();
    while (centroids.length < k && usedIndices.size < pixels.length) {
        const idx = Math.floor(Math.random() * pixels.length);
        if (!usedIndices.has(idx)) {
            centroids.push([...pixels[idx]]);
            usedIndices.add(idx);
        }
    }
    return centroids;
}

function initializeCentroidsKMeansPlusPlus(pixels, k) {
    const centroids = [];
    // 1. Choose the first centroid randomly
    const firstIdx = Math.floor(Math.random() * pixels.length);
    centroids.push([...pixels[firstIdx]]);

    const distances = new Array(pixels.length).fill(Infinity);

    // 2. For the remaining k-1 centroids
    while (centroids.length < k) {
        let totalDistance = 0;

        // For each pixel, find the squared distance to the nearest existing centroid
        for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            let closestDistSq = distances[i];

            const distSq = colorDistance(pixel, centroids[centroids.length - 1]) ** 2;
            if (distSq < closestDistSq) {
                distances[i] = distSq;
            }
        }

        totalDistance = distances.reduce((sum, d) => sum + d, 0);

        // Choose the next centroid with probability proportional to D(x)^2
        const randomVal = Math.random() * totalDistance;
        let cumulativeSum = 0;
        let nextCentroidIndex = -1;

        for (let i = 0; i < distances.length; i++) {
            cumulativeSum += distances[i];
            if (cumulativeSum >= randomVal) {
                nextCentroidIndex = i;
                break;
            }
        }
        
        if (nextCentroidIndex === -1) { // Fallback for floating point issues
             nextCentroidIndex = pixels.length - 1;
        }

        centroids.push([...pixels[nextCentroidIndex]]);
    }

    return centroids;
}

// Uses Bresenham's algorithm to get pixels for a line
function getLinePixels(p1, p2, width, height) {
    let x1 = Math.round(p1.x), y1 = Math.round(p1.y);
    let x2 = Math.round(p2.x), y2 = Math.round(p2.y);

    const pixels = [];
    const dx = Math.abs(x2 - x1);
    const dy = -Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx + dy;

    while(true) {
        if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height) {
            pixels.push({ x: x1, y: y1 });
        }
        if (x1 === x2 && y1 === y2) break;
        let e2 = 2 * err;
        if (e2 >= dy) { err += dy; x1 += sx; }
        if (e2 <= dx) { err += dx; y1 += sy; }
    }
    return pixels;
}

function getFormattedDateTime() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Calculates the tangent paths between two circles in both directions.
 * Each circle is a "pin" with a center {x, y} and a radius.
 * @param {object} p1 - The first pin, with { x, y, radius }.
 * @param {object} p2 - The second pin, with { x, y, radius }.
 * @returns {Array<object>} An array of directional path objects.
 */
function getTangentPaths(p1, p2) {
    // Ensure radii are numbers and non-negative
    const r1 = Number(p1.radius);
    const r2 = Number(p2.radius);
    if (isNaN(r1) || isNaN(r2) || r1 < 0 || r2 < 0) {
        console.error("Invalid radius provided to getTangentPaths.");
        return [];
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Handle edge cases
    if (d === 0) return []; // Same point
    if (d < Math.abs(r1 - r2)) return []; // One circle inside another

    const alpha = Math.atan2(dy, dx);
    const paths = [];

    // Helper to determine wrap direction based on string travel direction
    const getWrapDirection = (tangentPoint, circleCenter, stringDirection) => {
        // Vector from circle center to tangent point
        const radiusVec = { x: tangentPoint.x - circleCenter.x, y: tangentPoint.y - circleCenter.y };
        
        // Cross product Z component: radius × stringDirection
        const cross_z = radiusVec.x * stringDirection.y - radiusVec.y * stringDirection.x;
        
        // Positive cross product means counter-clockwise, negative means clockwise
        return cross_z > 0 ? 'AntiClockwise' : 'Clockwise';
    };

    // === External Tangents ===
    if (d >= Math.abs(r1 - r2)) {
        const beta = d > Math.abs(r1 - r2) ? Math.acos((r1 - r2) / d) : 0;

        // External tangent 1
        const t1_p1 = { x: p1.x + r1 * Math.cos(alpha - beta), y: p1.y + r1 * Math.sin(alpha - beta) };
        const t1_p2 = { x: p2.x + r2 * Math.cos(alpha - beta), y: p2.y + r2 * Math.sin(alpha - beta) };
        
        // Direction p1 → p2
        const dir_1to2 = { x: t1_p2.x - t1_p1.x, y: t1_p2.y - t1_p1.y };
        paths.push({
            startPoint: t1_p1,
            endPoint: t1_p2,
            type: 'External',
            wrapDirectionOnStartPin: getWrapDirection(t1_p1, p1, dir_1to2),
            wrapDirectionOnEndPin: getWrapDirection(t1_p2, p2, dir_1to2)
        });

        // Direction p2 → p1 (reverse direction)
        const dir_2to1 = { x: t1_p1.x - t1_p2.x, y: t1_p1.y - t1_p2.y };
        paths.push({
            startPoint: t1_p2,
            endPoint: t1_p1,
            type: 'External',
            wrapDirectionOnStartPin: getWrapDirection(t1_p2, p2, dir_2to1),
            wrapDirectionOnEndPin: getWrapDirection(t1_p1, p1, dir_2to1)
        });

        // External tangent 2
        const t2_p1 = { x: p1.x + r1 * Math.cos(alpha + beta), y: p1.y + r1 * Math.sin(alpha + beta) };
        const t2_p2 = { x: p2.x + r2 * Math.cos(alpha + beta), y: p2.y + r2 * Math.sin(alpha + beta) };
        
        // Direction p1 → p2
        const dir2_1to2 = { x: t2_p2.x - t2_p1.x, y: t2_p2.y - t2_p1.y };
        paths.push({
            startPoint: t2_p1,
            endPoint: t2_p2,
            type: 'External',
            wrapDirectionOnStartPin: getWrapDirection(t2_p1, p1, dir2_1to2),
            wrapDirectionOnEndPin: getWrapDirection(t2_p2, p2, dir2_1to2)
        });

        // Direction p2 → p1
        const dir2_2to1 = { x: t2_p1.x - t2_p2.x, y: t2_p1.y - t2_p2.y };
        paths.push({
            startPoint: t2_p2,
            endPoint: t2_p1,
            type: 'External',
            wrapDirectionOnStartPin: getWrapDirection(t2_p2, p2, dir2_2to1),
            wrapDirectionOnEndPin: getWrapDirection(t2_p1, p1, dir2_2to1)
        });
    }

    // === Internal Tangents ===
    if (d >= r1 + r2) {
        const gamma = Math.acos((r1 + r2) / d);

        // Internal tangent 1
        const ti1_p1 = { x: p1.x + r1 * Math.cos(alpha - gamma), y: p1.y + r1 * Math.sin(alpha - gamma) };
        const ti1_p2 = { x: p2.x - r2 * Math.cos(alpha - gamma), y: p2.y - r2 * Math.sin(alpha - gamma) };
        
        // Direction p1 → p2
        const diri1_1to2 = { x: ti1_p2.x - ti1_p1.x, y: ti1_p2.y - ti1_p1.y };
        paths.push({
            startPoint: ti1_p1,
            endPoint: ti1_p2,
            type: 'Internal',
            wrapDirectionOnStartPin: getWrapDirection(ti1_p1, p1, diri1_1to2),
            wrapDirectionOnEndPin: getWrapDirection(ti1_p2, p2, diri1_1to2)
        });

        // Direction p2 → p1
        const diri1_2to1 = { x: ti1_p1.x - ti1_p2.x, y: ti1_p1.y - ti1_p2.y };
        paths.push({
            startPoint: ti1_p2,
            endPoint: ti1_p1,
            type: 'Internal',
            wrapDirectionOnStartPin: getWrapDirection(ti1_p2, p2, diri1_2to1),
            wrapDirectionOnEndPin: getWrapDirection(ti1_p1, p1, diri1_2to1)
        });

        // Internal tangent 2
        const ti2_p1 = { x: p1.x + r1 * Math.cos(alpha + gamma), y: p1.y + r1 * Math.sin(alpha + gamma) };
        const ti2_p2 = { x: p2.x - r2 * Math.cos(alpha + gamma), y: p2.y - r2 * Math.sin(alpha + gamma) };
        
        // Direction p1 → p2
        const diri2_1to2 = { x: ti2_p2.x - ti2_p1.x, y: ti2_p2.y - ti2_p1.y };
        paths.push({
            startPoint: ti2_p1,
            endPoint: ti2_p2,
            type: 'Internal',
            wrapDirectionOnStartPin: getWrapDirection(ti2_p1, p1, diri2_1to2),
            wrapDirectionOnEndPin: getWrapDirection(ti2_p2, p2, diri2_1to2)
        });

        // Direction p2 → p1
        const diri2_2to1 = { x: ti2_p1.x - ti2_p2.x, y: ti2_p1.y - ti2_p2.y };
        paths.push({
            startPoint: ti2_p2,
            endPoint: ti2_p1,
            type: 'Internal',
            wrapDirectionOnStartPin: getWrapDirection(ti2_p2, p2, diri2_2to1),
            wrapDirectionOnEndPin: getWrapDirection(ti2_p1, p1, diri2_2to1)
        });
    }

    return paths;
}

function getRandomIndices(totalSize, sampleSize, exclusions = new Set()) {
    if (sampleSize >= totalSize - exclusions.size) {
        const allIndices = [];
        for (let i = 0; i < totalSize; i++) {
            if (!exclusions.has(i)) {
                allIndices.push(i);
            }
        }
        return allIndices;
    }

    const samples = new Set();
    while (samples.size < sampleSize) {
        const index = Math.floor(Math.random() * totalSize);
        if (!exclusions.has(index)) {
            samples.add(index);
        }
    }
    return Array.from(samples);
}

function isPathObstructed(path, startPin, endPin, allPins) {
    const p1 = path.startPoint;
    const p2 = path.endPoint;

    for (const pin of allPins) {
        // Skip the start and end pins of the path itself
        if (pin.id === startPin.id || pin.id === endPin.id) {
            continue;
        }

        // We only care about obstruction from central and middle pins
        if (pin.type === 'O') {
            continue;
        }

        const p3 = { x: pin.x, y: pin.y };
        const r = pin.radius;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        // If the line segment is a point, there's no obstruction to check.
        if (dx === 0 && dy === 0) {
            continue;
        }

        // Calculate the parameter 't' for the closest point on the line to the circle's center.
        // This tells us where the perpendicular from the circle's center lands on the line.
        const t = ((p3.x - p1.x) * dx + (p3.y - p1.y) * dy) / (dx * dx + dy * dy);

        let closestPoint;
        if (t < 0) {
            // Closest point is p1
            closestPoint = p1;
        } else if (t > 1) {
            // Closest point is p2
            closestPoint = p2;
        } else {
            // Closest point is on the segment
            closestPoint = { x: p1.x + t * dx, y: p1.y + t * dy };
        }

        // Calculate the distance from the closest point to the circle's center.
        const distDx = p3.x - closestPoint.x;
        const distDy = p3.y - closestPoint.y;
        const distance = Math.sqrt(distDx * distDx + distDy * distDy);

        // If the distance is less than the pin's radius, it's an intersection.
        if (distance < r) {
            return true; // Path is obstructed
        }
    }

    return false; // Path is not obstructed
} 