function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c / 2,
        r = 0,
        g = 0,
        b = 0;
    if (0 <= h && h < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
        r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    return [r, g, b];
}

const classicThreads = [ // The classic palette
    { name: 'R', color: [255, 0, 0] },
    { name: 'G', color: [0, 255, 0] },
    { name: 'B', color: [0, 0, 255] },
    { name: 'K', color: [0, 0, 0] },
    { name: 'W', color: [255, 255, 255] }
];

const extendedClassicThreads = [
    { name: 'R', color: [255, 0, 0] },
    { name: 'DR', color: [128, 0, 0] },
    { name: 'LR', color: [255, 128, 128] },
    { name: 'G', color: [0, 255, 0] },
    { name: 'DG', color: [0, 128, 0] },
    { name: 'LG', color: [128, 255, 128] },
    { name: 'B', color: [0, 0, 255] },
    { name: 'DB', color: [0, 0, 128] },
    { name: 'LB', color: [128, 128, 255] },
    { name: 'K', color: [0, 0, 0] },
    { name: 'W', color: [255, 255, 255] }
];

const blackAndWhiteThreads = [
    { name: 'K', color: [0, 0, 0] },
    { name: 'W', color: [255, 255, 255] }
];

const blackThreads = [ { name: 'K', color: [0, 0, 0] } ];
const whiteThreads = [ { name: 'W', color: [255, 255, 255] } ];

const lowSaturationThreads = [
    { name: 'R-L',  color: hslToRgb(0, 30, 50) },
    { name: 'R-VL', color: hslToRgb(0, 20, 50) },
    { name: 'R-VVL',color: hslToRgb(0, 10, 50) },
    { name: 'G-L',  color: hslToRgb(120, 30, 50) },
    { name: 'G-VL', color: hslToRgb(120, 20, 50) },
    { name: 'G-VVL',color: hslToRgb(120, 10, 50) },
    { name: 'B-L',  color: hslToRgb(240, 30, 50) },
    { name: 'B-VL', color: hslToRgb(240, 20, 50) },
    { name: 'B-VVL',color: hslToRgb(240, 10, 50) },
    { name: 'K', color: [0, 0, 0] },
    { name: 'G', color: [128, 128, 128] },
    { name: 'W', color: [255, 255, 255] }
];

const superExtendedThreads = (() => {
    const threads = [];
    const hues = { 'R': 0, 'G': 120, 'B': 240 };
    const lightnessLevels = { 'D': 25, 'M': 50, 'H': 75 }; // Dark, Medium, High
    const saturationLevels = { 'L': 33, 'M': 66, 'H': 100 }; // Low, Med, High

    for (const [colorName, hue] of Object.entries(hues)) {
        for (const [lightName, light] of Object.entries(lightnessLevels)) {
            for (const [satName, sat] of Object.entries(saturationLevels)) {
                threads.push({
                    name: `${colorName}-${lightName}${satName}`,
                    color: hslToRgb(hue, sat, light)
                });
            }
        }
    }
    // Add greyscale
    threads.push({ name: 'K', color: [0, 0, 0] });
    threads.push({ name: 'G1', color: [64, 64, 64] });
    threads.push({ name: 'G2', color: [128, 128, 128] });
    threads.push({ name: 'G3', color: [192, 192, 192] });
    threads.push({ name: 'W', color: [255, 255, 255] });
    return threads;
})();

const greyscaleThreads = [
    { name: 'K',  color: [0, 0, 0] },
    { name: 'G1', color: [43, 43, 43] },
    { name: 'G2', color: [85, 85, 85] },
    { name: 'G3', color: [128, 128, 128] },
    { name: 'G4', color: [170, 170, 170] },
    { name: 'G5', color: [213, 213, 213] },
    { name: 'W',  color: [255, 255, 255] }
];

const vibrantThreads = [
    { name: 'R', color: [255, 0, 0] },
    { name: 'G', color: [0, 255, 0] },
    { name: 'B', color: [0, 0, 255] },
    { name: 'K', color: [0, 0, 0] },
    { name: 'W', color: [255, 255, 255] },
    { name: 'O', color: [255, 165, 0] },   // Orange
    { name: 'P', color: [128, 0, 128] },    // Purple
    { name: 'Y', color: [255, 255, 0] },    // Yellow
    { name: 'T', color: [64, 224, 208] },  // Turquoise
    { name: 'PK', color: [255, 192, 203] } // Pink
]; 