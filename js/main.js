document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const imageLoader = document.getElementById('imageLoader');
    const sourceCanvas = document.getElementById('sourceCanvas');
    const previewCanvas = document.getElementById('previewCanvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
    const resolutionSelector = document.getElementById('resolution');
    const backgroundColorPicker = document.getElementById('backgroundColorPicker');

    const sliders = {
        brightness: document.getElementById('brightness'),
        contrast: document.getElementById('contrast'),
        saturation: document.getElementById('saturation'),
        pins: document.getElementById('pins'),
        lines: document.getElementById('lines'),
        pinDiameter: document.getElementById('pinDiameter'),
        artDiameter: document.getElementById('artDiameter'),
        opacity: document.getElementById('opacity'),
        minPinDistance: document.getElementById('minPinDistance'),
        monoLines: document.getElementById('monoLines'),
        maxRepeats: document.getElementById('maxRepeats'),
    };

    const sliderValues = {
        brightness: document.getElementById('brightnessValue'),
        contrast: document.getElementById('contrastValue'),
        saturation: document.getElementById('saturationValue'),
        pins: document.getElementById('pinsValue'),
        lines: document.getElementById('linesValue'),
        pinDiameter: document.getElementById('pinDiameterValue'),
        artDiameter: document.getElementById('artDiameterValue'),
        opacity: document.getElementById('opacityValue'),
        minPinDistance: document.getElementById('minPinDistanceValue'),
        monoLines: document.getElementById('monoLinesValue'),
        maxRepeats: document.getElementById('maxRepeatsValue'),
    };
    
    const generateBtn = document.getElementById('generateBtn');
    const downloadResultsBtn = document.getElementById('downloadResultsBtn');
    const generationProgressContainer = document.getElementById('generation-progress-container');
    const generationProgress = document.getElementById('generationProgress');
    const progressText = document.getElementById('progressText');
    const pauseResumeBtn = document.getElementById('pauseResumeBtn');
    const stopBtn = document.getElementById('stopBtn');
    const validationMessage = document.getElementById('validation-message');

    // New Color Analysis DOM Elements
    const paletteModeSelector = document.getElementById('paletteMode');
    const smartPaletteControls = document.getElementById('smartPaletteControls');
    const paletteColorsSlider = document.getElementById('paletteColors');
    const paletteColorsValue = document.getElementById('paletteColorsValue');
    const analyzePaletteBtn = document.getElementById('analyzePaletteBtn');
    const analyzeBinnedBtn = document.getElementById('analyzeBinnedBtn');
    const analyzeAverageBtn = document.getElementById('analyzeAverageBtn');
    const binnedPrecisionText = document.getElementById('binnedPrecisionText');
    const paletteDisplay = document.getElementById('paletteDisplay');
    const foregroundThresholdSlider = document.getElementById('foregroundThreshold');
    const foregroundThresholdValue = document.getElementById('foregroundThresholdValue');
    const foregroundSeparationControl = document.getElementById('foregroundSeparationControl');

    // Custom Palette DOM elements
    const customPaletteControls = document.getElementById('customPaletteControls');
    const addCustomColorBtn = document.getElementById('addCustomColorBtn');
    const customPalettePickerContainer = document.getElementById('customPalettePickerContainer');

    // Central Pin DOM elements
    const centralPinEnabledCheckbox = document.getElementById('centralPinEnabled');
    const centralPinControls = document.getElementById('centralPinControls');

    // Middle Pin DOM elements
    const middlePinsEnabledCheckbox = document.getElementById('middlePinsEnabled');
    const middlePinControls = document.getElementById('middlePinControls');
    const middlePinsSlider = document.getElementById('middlePins');
    const middlePinsValue = document.getElementById('middlePinsValue');
    const middlePinDistanceSlider = document.getElementById('middlePinDistance');
    const middlePinDistanceValue = document.getElementById('middlePinDistanceValue');

    // Stats and Graph DOM elements
    const statsContainer = document.getElementById('statsContainer');
    const similarityScore = document.getElementById('similarityScore');
    const similarityGraphCanvas = document.getElementById('similarityGraphCanvas');
    const similarityGraphCtx = similarityGraphCanvas.getContext('2d');

    // Color Forcing DOM elements
    const colorForcingEnabledCheckbox = document.getElementById('colorForcingEnabled');
    const colorForcingControls = document.getElementById('colorForcingControls');
    const colorForcingPercentageSlider = document.getElementById('colorForcingPercentage');
    const colorForcingPercentageValue = document.getElementById('colorForcingPercentageValue');
    const dominanceThresholdSlider = document.getElementById('dominanceThreshold');
    const dominanceThresholdValue = document.getElementById('dominanceThresholdValue');
    
    // Lookahead DOM elements
    const generationStrategySelector = document.getElementById('generationStrategy');
    const lookaheadControls = document.getElementById('lookaheadControls');
    const lookaheadSamplingSlider = document.getElementById('lookaheadSampling');
    const lookaheadSamplingValue = document.getElementById('lookaheadSamplingValue');

    // Estimated Thickness DOM element
    const estimatedThreadThickness = document.getElementById('estimatedThreadThickness');

    // Normalization Mode DOM element
    const normalizationModeSelector = document.getElementById('normalizationMode');
    let normalizationMode = normalizationModeSelector ? normalizationModeSelector.value : 'none';
    normalizationModeSelector.addEventListener('change', (e) => {
        normalizationMode = e.target.value;
    });

    // --- State Variables ---
    let sourceImage = null;
    let imageTransform = { scale: 1, pos: { x: 0, y: 0 } };
    let isPanning = false;
    let startPan = { x: 0, y: 0 };
    let pinSequence = [];
    let similarityHistory = [];
    let processedImageCanvas = null; // Offscreen canvas for the processed image
    let processingScheduled = false; // For throttling slider updates
    
    let isGenerating = false;
    let isPaused = false;
    let stopGeneration = false;
    let hasGenerated = false; // To track if a generation has run
    let totalStringLengthMm = 0;
    let currentResolution = 500;
    let currentBackgroundColor = '#FFFFFF';
    let activePalette = []; // Holds [[r,g,b], ...] for smart palette
    let isCentralPinEnabled = false;
    let areMiddlePinsEnabled = false;
    let isColorForcingEnabled = false;
    let binnedBackgroundPrecision = 1;
    let connectionMap = new Map(); // NEW: To store pre-computed tangent paths
    let obstructedMoves = []; // To store paths blocked by other pins

    // --- Initial Setup ---
    function initializeCanvases() {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        
        sourceCtx.fillStyle = '#ddd';
        sourceCtx.fillRect(0, 0, w, h);
        sourceCtx.font = "16px Arial";
        sourceCtx.fillStyle = "#888";
        sourceCtx.textAlign = "center";
        sourceCtx.fillText("Upload an image to begin", w / 2, h / 2);

        // Set initial state from controls
        isCentralPinEnabled = centralPinEnabledCheckbox.checked;
        areMiddlePinsEnabled = middlePinsEnabledCheckbox.checked;
        isColorForcingEnabled = colorForcingEnabledCheckbox.checked;
        centralPinControls.style.display = isCentralPinEnabled ? 'block' : 'none';
        middlePinControls.style.display = areMiddlePinsEnabled ? 'block' : 'none';
        colorForcingControls.style.display = isColorForcingEnabled ? 'block' : 'none';

        updatePreviewBackground();
        validatePinLayout();
        updatePaletteDisplay(activePalette);
        updateBinnedPrecisionText();
        updateCustomPalettePickers();
    }

    // --- Event Listeners ---
    resolutionSelector.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);

        if (hasGenerated) {
            const confirmed = confirm("Changing the resolution will clear the generated artwork. Are you sure you want to continue?");
            if (confirmed) {
                hasGenerated = false; 
                pinSequence = []; 
                updateResolution(newSize);
            } else {
                e.target.value = currentResolution; // Revert dropdown
                return;
            }
        } else {
            updateResolution(newSize);
        }
    });

    backgroundColorPicker.addEventListener('input', () => {
        const newColor = backgroundColorPicker.value;
        if (hasGenerated) {
            const confirmed = confirm("Changing the background color will clear the generated artwork. Are you sure you want to continue?");
            if (confirmed) {
                hasGenerated = false;
                pinSequence = [];
                currentBackgroundColor = newColor;
                updatePreviewBackgroundAndPins();
            } else {
                backgroundColorPicker.value = currentBackgroundColor; // Revert picker
                return;
            }
        } else {
            currentBackgroundColor = newColor;
            updatePreviewBackground();
        }
    });

    function updateBinnedPrecisionText() {
        if(binnedPrecisionText) {
            binnedPrecisionText.textContent = `Binned precision: ${binnedBackgroundPrecision}/10`;
        }
    }

    function updateResolution(newSize) {
        currentResolution = newSize;
        resolutionSelector.value = newSize;

        sourceCanvas.width = newSize;
        sourceCanvas.height = newSize;
        previewCanvas.width = newSize;
        previewCanvas.height = newSize;
        similarityGraphCanvas.width = newSize;

        initializeCanvases(); 
        
        if (sourceImage) {
            // Re-create the processed canvas at the new size
            processedImageCanvas = document.createElement('canvas');
            processedImageCanvas.width = newSize;
            processedImageCanvas.height = newSize;
            processImageAndRedraw(); // Re-process and draw the image
        }
    }

    imageLoader.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = event => {
                sourceImage = new Image();
                sourceImage.onload = () => {
                    resetImageSettings();

                    const canvasSize = sourceCanvas.width;
                    // To fill the circle, we use the max scale factor, which will crop the image if needed.
                    const scale = Math.max(canvasSize / sourceImage.width, canvasSize / sourceImage.height);
                    const initialX = (canvasSize / scale - sourceImage.width) / 2;
                    const initialY = (canvasSize / scale - sourceImage.height) / 2;
                    
                    imageTransform = {
                        scale: scale,
                        pos: { x: initialX, y: initialY }
                    };

                    processedImageCanvas = document.createElement('canvas');
                    processedImageCanvas.width = sourceCanvas.width;
                    processedImageCanvas.height = sourceCanvas.height;
                    processImageAndRedraw();
                };
                sourceImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    Object.keys(sliders).forEach(key => {
        sliders[key].addEventListener('input', () => {
            sliderValues[key].value = sliders[key].value;
            // For image settings, throttle the expensive redraw using requestAnimationFrame
            if (sourceImage && ['brightness', 'contrast', 'saturation'].includes(key)) {
                 if (!processingScheduled) {
                    processingScheduled = true;
                    requestAnimationFrame(() => {
                        processImageAndRedraw();
                        processingScheduled = false;
                    });
                }
            }
        });
    });

    Object.keys(sliderValues).forEach(key => {
        sliderValues[key].addEventListener('change', (e) => {
            const slider = sliders[key];
            let value = (key === 'pinDiameter') ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
            
            if (key === 'lines') {
                const min = parseInt(slider.min, 10);

                if (isNaN(value)) { // If not a number, revert to slider's last value.
                    value = slider.value;
                } else if (value < min) { // If below min, clamp to min.
                    value = min;
                }
                
                // If the new value is bigger than the slider's max, update the slider's max
                if (value > parseInt(slider.max, 10)) {
                    slider.max = value;
                }

            } else { // Original logic for all other sliders
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);

                if (isNaN(value)) {
                    value = slider.value;
                }
                if (value < min) {
                    value = min;
                }
                if (value > max) {
                    value = max;
                }
            }
            
            e.target.value = value;
            slider.value = value;

            // Manually trigger input event on slider to trigger redraw etc.
            slider.dispatchEvent(new Event('input'));
        });
        
        sliderValues[key].addEventListener('focus', e => e.target.select());
    });

    function updateMonoLinesSliderMax() {
        const numLines = parseInt(sliders.lines.value, 10);
        const monoSlider = sliders.monoLines;
        const monoValue = sliderValues.monoLines;
        
        monoSlider.max = numLines;
        monoValue.max = numLines;

        if (parseInt(monoSlider.value, 10) > numLines) {
            monoSlider.value = numLines;
            monoValue.value = numLines;
        }
    }

    sliders.lines.addEventListener('input', updateMonoLinesSliderMax);
    sliderValues.lines.addEventListener('change', updateMonoLinesSliderMax);

    ['pins', 'pinDiameter', 'artDiameter'].forEach(key => {
        sliders[key]?.addEventListener('input', validatePinLayout);
        sliderValues[key]?.addEventListener('change', validatePinLayout);
    });

    // Listen for changes that affect estimated thread thickness
    ['opacity', 'artDiameter'].forEach(key => {
        sliders[key]?.addEventListener('input', updateEstimatedThreadThickness);
        sliderValues[key]?.addEventListener('change', updateEstimatedThreadThickness);
    });
    resolutionSelector.addEventListener('change', updateEstimatedThreadThickness);

    centralPinEnabledCheckbox.addEventListener('change', (e) => {
        isCentralPinEnabled = e.target.checked;
        centralPinControls.style.display = isCentralPinEnabled ? 'block' : 'none';
        updatePreviewBackgroundAndPins();
    });

    middlePinsEnabledCheckbox.addEventListener('change', (e) => {
        areMiddlePinsEnabled = e.target.checked;
        middlePinControls.style.display = areMiddlePinsEnabled ? 'block' : 'none';
        updateSourceCanvas();
    });

    middlePinsSlider.addEventListener('input', () => {
        middlePinsValue.value = middlePinsSlider.value;
        updateSourceCanvas();
    });

    middlePinsValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(middlePinsSlider.min, 10);
        const max = parseInt(middlePinsSlider.max, 10);
        if (isNaN(value)) value = middlePinsSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        middlePinsSlider.value = value;
        updateSourceCanvas();
    });
    middlePinsValue.addEventListener('focus', e => e.target.select());

    middlePinDistanceSlider.addEventListener('input', () => {
        middlePinDistanceValue.value = middlePinDistanceSlider.value;
        updateSourceCanvas();
    });

    middlePinDistanceValue.addEventListener('change', (e) => {
        let value = parseFloat(e.target.value);
        const min = parseFloat(middlePinDistanceSlider.min);
        const max = parseFloat(middlePinDistanceSlider.max);
        if (isNaN(value)) value = middlePinDistanceSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value.toFixed(2);
        middlePinDistanceSlider.value = value;
        updateSourceCanvas();
    });
    middlePinDistanceValue.addEventListener('focus', e => e.target.select());

    colorForcingEnabledCheckbox.addEventListener('change', (e) => {
        isColorForcingEnabled = e.target.checked;
        colorForcingControls.style.display = isColorForcingEnabled ? 'block' : 'none';
    });

    colorForcingPercentageSlider.addEventListener('input', () => {
        colorForcingPercentageValue.value = colorForcingPercentageSlider.value;
    });

    colorForcingPercentageValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(colorForcingPercentageSlider.min, 10);
        const max = parseInt(colorForcingPercentageSlider.max, 10);
        if (isNaN(value)) value = colorForcingPercentageSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        colorForcingPercentageSlider.value = value;
    });
    colorForcingPercentageValue.addEventListener('focus', e => e.target.select());

    // Dominance Threshold syncing
    dominanceThresholdSlider.addEventListener('input', () => {
        dominanceThresholdValue.value = dominanceThresholdSlider.value;
    });

    dominanceThresholdValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(dominanceThresholdSlider.min, 10);
        const max = parseInt(dominanceThresholdSlider.max, 10);
        if (isNaN(value)) value = dominanceThresholdSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        dominanceThresholdSlider.value = value;
    });
    dominanceThresholdValue.addEventListener('focus', e => e.target.select());

    generationStrategySelector.addEventListener('change', (e) => {
        lookaheadControls.style.display = (e.target.value === 'lookahead') ? 'block' : 'none';
    });

    lookaheadSamplingSlider.addEventListener('input', () => {
        lookaheadSamplingValue.value = lookaheadSamplingSlider.value;
    });

    lookaheadSamplingValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(lookaheadSamplingSlider.min, 10);
        const max = parseInt(lookaheadSamplingSlider.max, 10);
        if (isNaN(value)) value = lookaheadSamplingSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        lookaheadSamplingSlider.value = value;
    });
    lookaheadSamplingValue.addEventListener('focus', e => e.target.select());

    function validatePinLayout() {
        const numPins = parseInt(sliders.pins.value, 10);
        const pinDiameter = parseFloat(sliders.pinDiameter.value);
        const artDiameterMm = parseFloat(sliders.artDiameter.value) * 10; // convert cm to mm
        const artCircumferenceMm = artDiameterMm * Math.PI;
        const totalPinWidthMm = numPins * pinDiameter;

        if (totalPinWidthMm >= artCircumferenceMm) {
            generateBtn.disabled = true;
            validationMessage.textContent = 'Pins won\'t fit. Reduce pin number or diameter.';
        } else {
            if (!isGenerating) { // Only enable if not already disabled by generation
                generateBtn.disabled = false;
            }
            validationMessage.textContent = '';
        }
    }

    function resetImageSettings() {
        const imageSettingKeys = ['brightness', 'contrast', 'saturation'];
        imageSettingKeys.forEach(key => {
            if (sliders[key]) {
                sliders[key].value = 100;
                sliderValues[key].value = '100';
            }
        });
    }
    
    sourceCanvas.addEventListener('mousedown', e => {
        if (!sourceImage) return;
        isPanning = true;
        startPan = { x: e.clientX, y: e.clientY };
        sourceCanvas.style.cursor = 'grabbing';
    });

    sourceCanvas.addEventListener('mouseup', () => {
        if (!sourceImage) return;
        isPanning = false;
        sourceCanvas.style.cursor = 'grab';
    });

    sourceCanvas.addEventListener('mouseleave', () => {
        if(isPanning) {
           isPanning = false;
           sourceCanvas.style.cursor = 'grab';
        }
    });
    
    sourceCanvas.addEventListener('mousemove', e => {
        if (isPanning && sourceImage) {
            const dx = e.clientX - startPan.x;
            const dy = e.clientY - startPan.y;
            imageTransform.pos.x += dx / imageTransform.scale;
            imageTransform.pos.y += dy / imageTransform.scale;
            startPan = { x: e.clientX, y: e.clientY };
            if (!processingScheduled) {
                processingScheduled = true;
                requestAnimationFrame(() => {
                    processImageAndRedraw();
                    processingScheduled = false;
                });
            }
        }
    });

    sourceCanvas.addEventListener('wheel', e => {
        if (!sourceImage) return;
        e.preventDefault();
        const rect = sourceCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomFactor = 1.05;
        const oldScale = imageTransform.scale;
        
        imageTransform.scale *= (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor);

        // Adjust position to zoom towards the mouse pointer
        imageTransform.pos.x = mouseX / imageTransform.scale - (mouseX / oldScale - imageTransform.pos.x);
        imageTransform.pos.y = mouseY / imageTransform.scale - (mouseY / oldScale - imageTransform.pos.y);

        if (!processingScheduled) {
            processingScheduled = true;
            requestAnimationFrame(() => {
                processImageAndRedraw();
                processingScheduled = false;
            });
        }
    });

    generateBtn.addEventListener('click', generateArt);
    downloadResultsBtn.addEventListener('click', downloadResults);
    
    pauseResumeBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
    });

    stopBtn.addEventListener('click', () => {
        if (isGenerating) {
            stopGeneration = true;
            isPaused = false; // Break pause loop to enact stop
        }
    });

    // --- Color Analysis Listeners ---
    paletteModeSelector.addEventListener('change', (e) => {
        const mode = e.target.value;
        smartPaletteControls.style.display = (mode === 'smart' || mode === 'smart-lines') ? 'block' : 'none';
        customPaletteControls.style.display = (mode === 'custom') ? 'block' : 'none';

        if (mode === 'smart-lines') {
            foregroundSeparationControl.style.display = 'none';
        } else {
            foregroundSeparationControl.style.display = 'block';
        }
    });

    paletteColorsSlider.addEventListener('input', () => {
        paletteColorsValue.value = paletteColorsSlider.value;
    });
    paletteColorsValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(paletteColorsSlider.min, 10);
        const max = parseInt(paletteColorsSlider.max, 10);
        if (isNaN(value)) value = paletteColorsSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        paletteColorsSlider.value = value;
    });
    paletteColorsValue.addEventListener('focus', e => e.target.select());
    
    foregroundThresholdSlider.addEventListener('input', () => {
        foregroundThresholdValue.value = foregroundThresholdSlider.value;
    });
    foregroundThresholdValue.addEventListener('change', (e) => {
        let value = parseInt(e.target.value, 10);
        const min = parseInt(foregroundThresholdSlider.min, 10);
        const max = parseInt(foregroundThresholdSlider.max, 10);
        if (isNaN(value)) value = foregroundThresholdSlider.value;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        foregroundThresholdSlider.value = value;
    });
    foregroundThresholdValue.addEventListener('focus', e => e.target.select());

    analyzePaletteBtn.addEventListener('click', analyzeSmartPalette);
    analyzeBinnedBtn.addEventListener('click', analyzeBinnedBackgroundColor);
    analyzeAverageBtn.addEventListener('click', analyzeAverageBackgroundColor);

    addCustomColorBtn.addEventListener('click', () => {
        addCustomColorPicker();
    });

    // --- Core Functions ---
    function getAllPins() {
        const allPins = [];
        let pinIdCounter = 0;
        
        const numPins = parseInt(sliders.pins.value, 10);
        const pinDiameter = parseFloat(sliders.pinDiameter.value);
        const w = previewCanvas.width;
        const h = previewCanvas.height;
        const outerCircleRadius = Math.min(w, h) / 2; // Radius of the circle on which outer pins lie
        const center = { x: w / 2, y: h / 2 };
        const artDiameterMm = parseFloat(sliders.artDiameter.value) * 10; // This is a fixed physical dimension
        const pxPerMm = w / artDiameterMm;
        const pinRadiusPx = (pinDiameter / 2) * pxPerMm;

        // Add Outer Pins
        for (let i = 0; i < numPins; i++) {
            const angle = -Math.PI / 2 + (i / numPins) * 2 * Math.PI;
            allPins.push({
                id: pinIdCounter++,
                type: 'O', // Outer
                num: i + 1,
                x: center.x + outerCircleRadius * Math.cos(angle),
                y: center.y + outerCircleRadius * Math.sin(angle),
                radius: pinRadiusPx
            });
        }

        // Add Central Pin
        if (centralPinEnabledCheckbox.checked) {
            allPins.push({
                id: pinIdCounter++,
                type: 'C', // Central
                num: 1,
                x: center.x,
                y: center.y,
                radius: pinRadiusPx
            });
        }

        // Add Middle Pins
        if (areMiddlePinsEnabled) {
            const numMiddlePins = parseInt(middlePinsSlider.value, 10);
            const middlePinDistance = parseFloat(middlePinDistanceSlider.value);
            const middleCircleRadius = outerCircleRadius * middlePinDistance;
            for (let i = 0; i < numMiddlePins; i++) {
                const angle = -Math.PI / 2 + (i / numMiddlePins) * 2 * Math.PI;
                allPins.push({
                    id: pinIdCounter++,
                    type: 'M', // Middle
                    num: i + 1,
                    x: center.x + middleCircleRadius * Math.cos(angle),
                    y: center.y + middleCircleRadius * Math.sin(angle),
                    radius: pinRadiusPx
                });
            }
        }
        return allPins;
    }

    function updatePreviewBackground() {
        const w = previewCanvas.width;
        const h = previewCanvas.height;
        previewCtx.fillStyle = currentBackgroundColor;
        previewCtx.fillRect(0, 0, w, h);
    }

    function updatePreviewBackgroundAndPins() {
        updatePreviewBackground();
        const numPins = parseInt(sliders.pins.value, 10);
        const w = previewCanvas.width;
        const h = previewCanvas.height;
        const radius = Math.min(w, h) / 2;
        const center = { x: w / 2, y: h / 2 };
        const pinDiameter = parseFloat(sliders.pinDiameter.value);
        const artDiameterMm = parseFloat(sliders.artDiameter.value) * 10;
        const pxPerMm = w / artDiameterMm;
        const pinRadiusPx = (pinDiameter / 2) * pxPerMm;

        previewCtx.fillStyle = 'white'; // Pin color

        // Draw Outer Pins
        for (let i = 0; i < numPins; i++) {
            const angle = -Math.PI / 2 + (i / numPins) * 2 * Math.PI;
            const pinCenterX = center.x + radius * Math.cos(angle);
            const pinCenterY = center.y + radius * Math.sin(angle);
            
            previewCtx.beginPath();
            previewCtx.arc(pinCenterX, pinCenterY, pinRadiusPx, 0, 2 * Math.PI);
            previewCtx.fill();
        }

        // Draw Central Pin
        if (isCentralPinEnabled) {
            previewCtx.beginPath();
            previewCtx.arc(center.x, center.y, pinRadiusPx, 0, 2 * Math.PI);
            previewCtx.fill();
        }

        // Draw Middle Pins
        if (areMiddlePinsEnabled) {
            const numMiddlePins = parseInt(middlePinsSlider.value, 10);
            const middlePinDistance = parseFloat(middlePinDistanceSlider.value);
            const middleRadius = radius * middlePinDistance;
            for (let i = 0; i < numMiddlePins; i++) {
                const angle = -Math.PI / 2 + (i / numMiddlePins) * 2 * Math.PI;
                const pinCenterX = center.x + middleRadius * Math.cos(angle);
                const pinCenterY = center.y + middleRadius * Math.sin(angle);
                
                previewCtx.beginPath();
                previewCtx.arc(pinCenterX, pinCenterY, pinRadiusPx, 0, 2 * Math.PI);
                previewCtx.fill();
            }
        }
    }

    function processImageAndRedraw() {
        if (!sourceImage || !processedImageCanvas) return;
        
        const pCtx = processedImageCanvas.getContext('2d');
        // Use a neutral background color that won't interfere with masking.
        pCtx.fillStyle = '#f9f9f9'; 
        pCtx.fillRect(0, 0, pCtx.canvas.width, pCtx.canvas.height);
        
        // Draw the transformed source image (pan/zoom) onto the offscreen canvas
        const { scale, pos } = imageTransform;
        pCtx.save();
        pCtx.translate(pos.x * scale, pos.y * scale);
        pCtx.scale(scale, scale);
        pCtx.drawImage(sourceImage, 0, 0);
        pCtx.restore();
        
        const imageData = pCtx.getImageData(0, 0, pCtx.canvas.width, pCtx.canvas.height);
        const data = imageData.data;

        const brightness = parseInt(sliders.brightness.value, 10) - 100;
        const contrast = parseInt(sliders.contrast.value, 10) - 100;
        const saturation = parseInt(sliders.saturation.value, 10) / 100;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            // Apply Brightness
            let r = data[i] + brightness;
            let g = data[i + 1] + brightness;
            let b = data[i + 2] + brightness;

            // Apply Contrast
            r = factor * (r - 128) + 128;
            g = factor * (g - 128) + 128;
            b = factor * (b - 128) + 128;

            // Apply Saturation
            if (saturation !== 1) {
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                r = luma + saturation * (r - luma);
                g = luma + saturation * (g - luma);
                b = luma + saturation * (b - luma);
            }
            
            // Clamp values
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        pCtx.putImageData(imageData, 0, 0);
        updateSourceCanvas();
    }

    function updateSourceCanvas() {
        if (!sourceImage || !processedImageCanvas) {
            initializeCanvases();
            return;
        };

        const w = sourceCanvas.width;
        const h = sourceCanvas.height;

        // Clear and draw the processed (brightness/contrast) image
        sourceCtx.save();
        sourceCtx.fillStyle = '#f9f9f9';
        sourceCtx.fillRect(0, 0, w, h);
        sourceCtx.drawImage(processedImageCanvas, 0, 0);

        // Apply circular mask
        sourceCtx.globalCompositeOperation = 'destination-in';
        sourceCtx.beginPath();
        sourceCtx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, 2 * Math.PI);
        sourceCtx.fill();
        sourceCtx.restore();

        drawMiddlePinOverlay(w, h);
    }

    function drawMiddlePinOverlay(width, height) {
        if (!middlePinsEnabledCheckbox.checked) return;

        const radius = Math.min(width, height) / 2;
        const middlePinDistance = parseFloat(middlePinDistanceSlider.value);
        const middleRadius = radius * middlePinDistance;

        sourceCtx.save();
        sourceCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        sourceCtx.lineWidth = 1;
        sourceCtx.setLineDash([3, 3]);
        sourceCtx.beginPath();
        sourceCtx.arc(width / 2, height / 2, middleRadius, 0, 2 * Math.PI);
        sourceCtx.stroke();
        sourceCtx.restore();
    }
    
    function toggleControls(disabled) {
        Object.values(sliders).forEach(slider => slider.disabled = disabled);
        generateBtn.disabled = disabled;
        imageLoader.disabled = disabled; 
        downloadResultsBtn.disabled = disabled;
        analyzePaletteBtn.disabled = disabled;
        analyzeBinnedBtn.disabled = disabled;
        analyzeAverageBtn.disabled = disabled;
        centralPinEnabledCheckbox.disabled = disabled;
        middlePinsEnabledCheckbox.disabled = disabled;
        middlePinsSlider.disabled = disabled;
        middlePinsValue.disabled = disabled;
        middlePinDistanceSlider.disabled = disabled;
        middlePinDistanceValue.disabled = disabled;
        sliders.monoLines.disabled = disabled;
        sliderValues.monoLines.disabled = disabled;
        colorForcingEnabledCheckbox.disabled = disabled;
        colorForcingPercentageSlider.disabled = disabled;
        colorForcingPercentageValue.disabled = disabled;
        dominanceThresholdSlider.disabled = disabled;
        dominanceThresholdValue.disabled = disabled;
        sliders.maxRepeats.disabled = disabled;
        sliderValues.maxRepeats.disabled = disabled;
        generationStrategySelector.disabled = disabled;
        lookaheadSamplingSlider.disabled = disabled;
        lookaheadSamplingValue.disabled = disabled;
    }

    // Toggle function for Advanced section
    window.toggleAdvanced = function() {
        const advancedControls = document.getElementById('advancedControls');
        const advancedArrow = document.getElementById('advancedArrow');
        
        if (advancedControls.style.display === 'none') {
            advancedControls.style.display = 'block';
            advancedArrow.style.transform = 'rotate(180deg)';
        } else {
            advancedControls.style.display = 'none';
            advancedArrow.style.transform = 'rotate(0deg)';
        }
    }

    async function generateArt() {
        if (!sourceImage) {
            alert('Please upload an image first.');
            return;
        }
        if (isGenerating) return;
        
        console.time('Total Generation');
        
        // --- Generation Setup ---
        isGenerating = true;
        isPaused = false;
        stopGeneration = false;
        toggleControls(true);
        generateBtn.style.display = 'none';
        generationProgressContainer.style.display = 'block';
        statsContainer.style.display = 'flex';
        pauseResumeBtn.textContent = 'Pause';
        pinSequence = [];
        similarityHistory = [];
        totalStringLengthMm = 0;
        const connectionCounts = new Map();
        obstructedMoves = []; // Reset obstructed moves list

        // 1. Setup
        const numPins = parseInt(sliders.pins.value, 10);
        const pinDiameter = parseFloat(sliders.pinDiameter.value);
        const numLines = parseInt(sliders.lines.value, 10);
        const lineOpacity = parseInt(sliders.opacity.value, 10) / 100;
        const minPinDistance = parseInt(sliders.minPinDistance.value, 10);
        const monoLines = parseInt(sliders.monoLines.value, 10);
        const maxRepeats = parseInt(sliders.maxRepeats.value, 10);
        const generationStrategy = generationStrategySelector.value;
        const lookaheadSampling = parseInt(lookaheadSamplingValue.value, 10) / 100;
        
        const w = previewCanvas.width;
        const h = previewCanvas.height;
        const radius = Math.min(w, h) / 2;
        const center = { x: w / 2, y: h / 2 };
        const artDiameterMm = parseFloat(sliders.artDiameter.value) * 10;
        const pxPerMm = w / artDiameterMm;
        const pinRadiusPx = (pinDiameter / 2) * pxPerMm;
        const radiusSq = radius * radius;
        
        // Central Pin params
        const centralPinEnabled = centralPinEnabledCheckbox.checked;

        // Progress UI
        generationProgress.max = numLines;
        generationProgress.value = 0;
        progressText.textContent = `0 / ${numLines}`;

        // Clear preview canvas and draw pins
        updatePreviewBackgroundAndPins();

        // --- NEW: Unified Pin Setup & Pre-computation ---
        const allPins = getAllPins();
        await precomputeTangentMap(allPins);
        
        if (allPins.length < 2) {
            alert("Not enough pins to generate artwork. Enable at least two pins.");
            isGenerating = false;
            toggleControls(false);
            generateBtn.style.display = 'block';
            generationProgressContainer.style.display = 'none';
            return;
        }


        // 3. Get target image data & initialize buffers
        updateSourceCanvas(); // Ensure source is processed and masked
        const targetData = sourceCtx.getImageData(0, 0, w, h).data;
        const currentData = previewCtx.getImageData(0, 0, w, h).data; // Starts with background color

        // Calculate initial similarity
        const initialSimilarity = calculateSimilarity(targetData, currentData, w, h);
        similarityHistory.push(initialSimilarity);
        similarityScore.textContent = `${initialSimilarity.toFixed(2)}%`;
        drawSimilarityGraph();

        // 4. Thread setup based on palette mode
        let paletteToUse = [];
        const selectedPalette = paletteModeSelector.value;

        if (selectedPalette === 'custom') {
            const colorPickers = customPalettePickerContainer.querySelectorAll('input[type="color"]');
            colorPickers.forEach((picker, i) => {
                const hex = picker.value;
                const r = parseInt(hex.substring(1, 3), 16);
                const g = parseInt(hex.substring(3, 5), 16);
                const b = parseInt(hex.substring(5, 7), 16);
                paletteToUse.push({ name: `C${i + 1}`, color: [r, g, b] });
            });
        } else if ((selectedPalette === 'smart' || selectedPalette === 'smart-lines') && activePalette.length > 0) {
            paletteToUse = activePalette.map((rgb, i) => ({ name: `C${i+1}`, color: rgb }));
        } else if (selectedPalette === 'vibrant') {
            paletteToUse = vibrantThreads;
        } else if (selectedPalette === 'extended-classic') {
            paletteToUse = extendedClassicThreads;
        } else if (selectedPalette === 'low-saturation') {
            paletteToUse = lowSaturationThreads;
        } else if (selectedPalette === 'super-extended') {
            paletteToUse = superExtendedThreads;
        } else if (selectedPalette === 'greyscale') {
            paletteToUse = greyscaleThreads;
        } else if (selectedPalette === 'black-white') {
            paletteToUse = blackAndWhiteThreads;
        } else if (selectedPalette === 'black') {
            paletteToUse = blackThreads;
        } else if (selectedPalette === 'white') {
            paletteToUse = whiteThreads;
        } else { // 'classic' or fallback
            paletteToUse = classicThreads;
        }

        if (paletteToUse.length === 0) {
            alert("No color palette available. Please select a valid palette or analyze image colors for 'Smart' mode.");
            isGenerating = false;
            toggleControls(false);
            generateBtn.style.display = 'block';
            generationProgressContainer.style.display = 'none';
            return;
        }

        const threads = paletteToUse.map(p => ({
            ...p,
            posIdx: Math.floor(Math.random() * allPins.length),
            previousPosIdx: null, // To track the last pin for arc calculations
            entryWrapDir: null // 'Clockwise' or 'AntiClockwise'
        }));
        
        const monoThreads = threads.filter(t => t.color[0] === t.color[1] && t.color[1] === t.color[2]);

        // 5. Main Loop
        let lineCounter = 0;

        // --- Phase 1: Monochromatic Lines ---
        console.log(`Starting Phase 1: Monochromatic Lines (${monoLines} lines)`);
        for (let i = 0; i < monoLines && lineCounter < numLines; i++) {
            if (stopGeneration) break;
            while (isPaused) { await new Promise(resolve => setTimeout(resolve, 100)); if (stopGeneration) break; }
            if (stopGeneration) break;

            await executeBestMove(monoThreads.length > 0 ? monoThreads : threads, allPins, {
                targetData, currentData, w, h, center, radiusSq, lineOpacity, minPinDistance, numPins, maxRepeats, connectionCounts,
                generationStrategy, lookaheadSampling
            });
            lineCounter++;
            await updateProgressUI(lineCounter, numLines);
        }
        
        // --- Phase 2: Color Forcing ---
        if (isColorForcingEnabled && !stopGeneration) {
            const forcingPercentage = parseInt(colorForcingPercentageSlider.value, 10) / 100;
            const forcingLinesTotal = Math.floor((numLines - monoLines) * forcingPercentage);
            const dominanceThreshold = parseInt(dominanceThresholdSlider.value, 10);
            console.log(`Starting Phase 2: Color Forcing (${forcingLinesTotal} lines)`);

            const nonMonoThreads = threads.filter(t => !monoThreads.includes(t));
            if (nonMonoThreads.length > 0) {
                progressText.textContent = 'Analyzing...';
                await new Promise(resolve => requestAnimationFrame(resolve)); // Allow UI to update
                const colorDistribution = await calculateColorDistribution(targetData, nonMonoThreads.map(t => t.color), w, h, center, radiusSq, dominanceThreshold);
                
                for (const thread of nonMonoThreads) {
                    const threadColorKey = thread.color.join(',');
                    const numLinesForThread = Math.round(forcingLinesTotal * colorDistribution[threadColorKey]);

                    for (let i = 0; i < numLinesForThread && lineCounter < numLines; i++) {
                        if (stopGeneration) break;
                        while (isPaused) { await new Promise(resolve => setTimeout(resolve, 100)); if (stopGeneration) break; }
                        if (stopGeneration) break;
                        
                        await executeBestMove([thread], allPins, {
                            targetData, currentData, w, h, center, radiusSq, lineOpacity, minPinDistance, numPins, maxRepeats, connectionCounts,
                            generationStrategy, lookaheadSampling
                        });
                        lineCounter++;
                        await updateProgressUI(lineCounter, numLines);
                    }
                    if (stopGeneration) break;
                }
            }
        }
        
        // --- Phase 3: Open Competition ---
        console.log(`Starting Phase 3: Open Competition (${numLines - lineCounter} lines)`);
        while (lineCounter < numLines && !stopGeneration) {
            if (stopGeneration) break;
            while (isPaused) { await new Promise(resolve => setTimeout(resolve, 100)); if (stopGeneration) break; }
            if (stopGeneration) break;

            await executeBestMove(threads, allPins, {
                targetData, currentData, w, h, center, radiusSq, lineOpacity, minPinDistance, numPins, maxRepeats, connectionCounts,
                generationStrategy, lookaheadSampling
            });
            lineCounter++;
            await updateProgressUI(lineCounter, numLines);
        }
        
        // --- Cleanup ---
        hasGenerated = true;
        isGenerating = false;
        toggleControls(false);
        generateBtn.style.display = 'block';
        generationProgressContainer.style.display = 'none';
        console.timeEnd('Total Generation');
    }

    async function precomputeTangentMap(allPins) {
        console.time('Precomputing Tangent Map');
        connectionMap = new Map();
        obstructedMoves = []; // Clear previous obstructions
        const totalPairs = (allPins.length * (allPins.length - 1)) / 2;
        let computedPairs = 0;
        
        progressText.textContent = `Analyzing paths: 0%`;
        await new Promise(resolve => requestAnimationFrame(resolve));

        for (let i = 0; i < allPins.length; i++) {
            for (let j = i + 1; j < allPins.length; j++) {
                const pin1 = allPins[i];
                const pin2 = allPins[j];

                const paths = getTangentPaths(pin1, pin2);
                
                const pathsFromPin1 = paths.filter(p => {
                    const startX = p.startPoint.x;
                    const startY = p.startPoint.y;
                    const dist1 = Math.sqrt((startX - pin1.x)**2 + (startY - pin1.y)**2);
                    const dist2 = Math.sqrt((startX - pin2.x)**2 + (startY - pin2.y)**2);
                    return dist1 < dist2;
                });
                
                const pathsFromPin2 = paths.filter(p => {
                    const startX = p.startPoint.x;
                    const startY = p.startPoint.y;
                    const dist1 = Math.sqrt((startX - pin1.x)**2 + (startY - pin1.y)**2);
                    const dist2 = Math.sqrt((startX - pin2.x)**2 + (startY - pin2.y)**2);
                    return dist2 < dist1;
                });

                const validPathsFromPin1 = [];
                pathsFromPin1.forEach(p => {
                    if (isPathObstructed(p, pin1, pin2, allPins)) {
                        obstructedMoves.push({ from: pin1, to: pin2, path: p });
                    } else {
                        validPathsFromPin1.push({ ...p, startPinId: pin1.id, endPinId: pin2.id });
                    }
                });
                
                const validPathsFromPin2 = [];
                pathsFromPin2.forEach(p => {
                    if (isPathObstructed(p, pin2, pin1, allPins)) {
                        obstructedMoves.push({ from: pin2, to: pin1, path: p });
                    } else {
                        validPathsFromPin2.push({ ...p, startPinId: pin2.id, endPinId: pin1.id });
                    }
                });

                const key1to2 = `${pin1.id}-${pin2.id}`;
                connectionMap.set(key1to2, validPathsFromPin1);

                const key2to1 = `${pin2.id}-${pin1.id}`;
                connectionMap.set(key2to1, validPathsFromPin2);
                
                computedPairs++;
            }
            // Update UI periodically to avoid freezing
            const progress = Math.round((computedPairs / totalPairs) * 100);
            progressText.textContent = `Analyzing paths: ${progress}%`;
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
        }
        console.timeEnd('Precomputing Tangent Map');
    }

    async function executeBestMove(threadsForStep, allPins, params) {
        let bestMove = { score: -Infinity };
        const {
            targetData, currentData, w, h, center, radiusSq, lineOpacity,
            minPinDistance, numPins, maxRepeats, connectionCounts,
            generationStrategy, lookaheadSampling
        } = params;
    
        if (generationStrategy === 'lookahead') {
            // --- LOOKAHEAD STRATEGY ---
            for (const thread of threadsForStep) {
                const startPin = allPins[thread.posIdx];
    
                // --- First move candidates ---
                for (let nextIdx = 0; nextIdx < allPins.length; nextIdx++) {
                    if (thread.posIdx === nextIdx) continue;
                    
                    const nextPin = allPins[nextIdx];
    
                    const connectionKey1 = `${Math.min(startPin.id, nextPin.id)}-${Math.max(startPin.id, nextPin.id)}`;
                    if ((connectionCounts.get(connectionKey1) || 0) >= maxRepeats) continue;
    
                    if (startPin.type === 'O' && nextPin.type === 'O') {
                        const d = Math.abs((startPin.num - 1) - (nextPin.num - 1));
                        if (Math.min(d, numPins - d) < minPinDistance) continue;
                    }
    
                    const pathOptions1 = connectionMap.get(`${startPin.id}-${nextPin.id}`) || [];
                    const validPaths1 = thread.entryWrapDir
                        ? pathOptions1.filter(p => p.wrapDirectionOnStartPin === thread.entryWrapDir)
                        : pathOptions1;
    
                    for (const path1 of validPaths1) {
                        const pixels1 = getLinePixels(path1.startPoint, path1.endPoint, w, h);
                        const score1 = calculateScoreForPath(pixels1, targetData, currentData, thread.color, lineOpacity, center, radiusSq);
    
                        // --- Lookahead to second move ---
                        let bestScore2 = 0;
                        const sampleSize = Math.ceil((allPins.length - 2) * lookaheadSampling);
                        const exclusions = new Set([thread.posIdx, nextIdx]);
                        const thirdPinIndices = getRandomIndices(allPins.length, sampleSize, exclusions);
    
                        for (const thirdIdx of thirdPinIndices) {
                            const thirdPin = allPins[thirdIdx];
    
                            const connectionKey2 = `${Math.min(nextPin.id, thirdPin.id)}-${Math.max(nextPin.id, thirdPin.id)}`;
                            if ((connectionCounts.get(connectionKey2) || 0) >= maxRepeats) continue;
                            
                            if (nextPin.type === 'O' && thirdPin.type === 'O') {
                                 const d = Math.abs((nextPin.num - 1) - (thirdPin.num - 1));
                                 if (Math.min(d, numPins - d) < minPinDistance) continue;
                            }
    
                            const pathOptions2 = connectionMap.get(`${nextPin.id}-${thirdPin.id}`) || [];
                            const validPaths2 = pathOptions2.filter(p => p.wrapDirectionOnStartPin === path1.wrapDirectionOnEndPin);
    
                            let bestPathScore2 = -Infinity;
                            for (const path2 of validPaths2) {
                                const pixels2 = getLinePixels(path2.startPoint, path2.endPoint, w, h);
                                const score2 = calculateScoreForPath(pixels2, targetData, currentData, thread.color, lineOpacity, center, radiusSq);
                                if (score2 > bestPathScore2) {
                                    bestPathScore2 = score2;
                                }
                            }
                            if (bestPathScore2 > bestScore2) {
                                bestScore2 = bestPathScore2;
                            }
                        }
    
                        const totalScore = score1 + bestScore2;
                        if (totalScore > bestMove.score) {
                            bestMove = {
                                score: totalScore,
                                thread,
                                endPin: nextPin,
                                endPinIdx: nextIdx,
                                pixels: pixels1,
                                chosenPath: path1
                            };
                        }
                    }
                }
            }
        } else {
            // --- GREEDY STRATEGY (Original Logic) ---
            for (const thread of threadsForStep) {
                const startPin = allPins[thread.posIdx];
    
                for (let nextIdx = 0; nextIdx < allPins.length; nextIdx++) {
                    if (thread.posIdx === nextIdx) continue;
                    
                    const nextPin = allPins[nextIdx];
                    const connectionKey = `${Math.min(startPin.id, nextPin.id)}-${Math.max(startPin.id, nextPin.id)}`;
                    if ((connectionCounts.get(connectionKey) || 0) >= maxRepeats) continue;
    
                    if (startPin.type === 'O' && nextPin.type === 'O') {
                        const startPinNum = startPin.num - 1;
                        const nextPinNum = nextPin.num - 1;
                        const pinDistance = Math.min(Math.abs(startPinNum - nextPinNum), numPins - Math.abs(startPinNum - nextPinNum));
                        if (pinDistance < minPinDistance) continue;
                    }
    
                    const pathOptions = connectionMap.get(`${startPin.id}-${nextPin.id}`) || [];
                    let validPaths = pathOptions;
                    if (thread.entryWrapDir) {
                        validPaths = pathOptions.filter(p => p.wrapDirectionOnStartPin === thread.entryWrapDir);
                    }
    
                    for (const path of validPaths) {
                        const pathPixels = getLinePixels(path.startPoint, path.endPoint, w, h);
                        const score = calculateScoreForPath(pathPixels, targetData, currentData, thread.color, lineOpacity, center, radiusSq);
    
                        if (score > bestMove.score) {
                            bestMove = {
                                score,
                                thread,
                                endPin: nextPin,
                                endPinIdx: nextIdx,
                                pixels: pathPixels,
                                chosenPath: path
                            };
                        }
                    }
                }
            }
        }
    
        if (bestMove.score === -Infinity) return; // No improvement found
        
        const { thread, endPin, endPinIdx, pixels, chosenPath } = bestMove;
        const startPin = allPins[thread.posIdx];
        
        // Draw the winning line on the visible canvas
        previewCtx.beginPath();
        previewCtx.moveTo(chosenPath.startPoint.x, chosenPath.startPoint.y);
        previewCtx.lineTo(chosenPath.endPoint.x, chosenPath.endPoint.y);

        previewCtx.strokeStyle = `rgba(${thread.color.join(',')}, ${lineOpacity})`;
        previewCtx.lineWidth = 1;
        previewCtx.stroke();
        
        // Update the underlying currentData buffer for the next iteration's calculations
        const [sR, sG, sB] = thread.color;
        const a = lineOpacity;
        for (const p of pixels) {
             const dx = p.x - center.x;
             const dy = p.y - center.y;
             if ((dx * dx + dy * dy) > radiusSq) continue;

            const idx = (p.y * w + p.x) * 4;
            currentData[idx] = sR * a + currentData[idx] * (1 - a);
            currentData[idx+1] = sG * a + currentData[idx+1] * (1 - a);
            currentData[idx+2] = sB * a + currentData[idx+2] * (1 - a);
        }
        
        // Add length to total for stats
        const artDiameterMm = parseFloat(sliders.artDiameter.value) * 10;
        const pxPerMm = w / artDiameterMm;
        
        // Straight line part
        const dx = chosenPath.endPoint.x - chosenPath.startPoint.x;
        const dy = chosenPath.endPoint.y - chosenPath.startPoint.y;
        totalStringLengthMm += Math.sqrt(dx*dx + dy*dy) / pxPerMm;

        // Arc part - use the thread's history for accurate calculation
        if (thread.previousPosIdx != null) {
             const previousPin = allPins[thread.previousPosIdx];
             const incomingPathKey = `${previousPin.id}-${startPin.id}`;
             const incomingPath = (connectionMap.get(incomingPathKey) || []).find(p => p.wrapDirectionOnEndPin === thread.entryWrapDir);
             
             if(incomingPath) {
                const vecIn = { x: incomingPath.endPoint.x - startPin.x, y: incomingPath.endPoint.y - startPin.y };
                const vecOut = { x: chosenPath.startPoint.x - startPin.x, y: chosenPath.startPoint.y - startPin.y };
                
                let angle = Math.atan2(vecOut.y, vecOut.x) - Math.atan2(vecIn.y, vecIn.x);
                if (thread.entryWrapDir === 'Clockwise' && angle < 0) angle += 2 * Math.PI;
                if (thread.entryWrapDir === 'AntiClockwise' && angle > 0) angle -= 2 * Math.PI;

                const arcLengthPx = Math.abs(angle) * startPin.radius;
                totalStringLengthMm += arcLengthPx / pxPerMm;
             }
        }
        
        // Update similarity score and graph
        const currentSimilarity = calculateSimilarity(targetData, currentData, w, h);
        similarityHistory.push(currentSimilarity);
        similarityScore.textContent = `${currentSimilarity.toFixed(2)}%`;
        drawSimilarityGraph();

        // Update sequence log
        pinSequence.push({
            threadName: thread.name,
            threadColor: thread.color, // Save the RGB array
            from: startPin,
            to: endPin,
            wrap: chosenPath.wrapDirectionOnEndPin
        });
        
        // Update the winning thread's state for the next iteration
        thread.previousPosIdx = thread.posIdx; // Store current pin as previous
        thread.posIdx = endPinIdx;
        thread.entryWrapDir = chosenPath.wrapDirectionOnEndPin;
        
        // Update the connection count for the chosen move
        const bestMoveKey = `${Math.min(startPin.id, endPin.id)}-${Math.max(startPin.id, endPin.id)}`;
        connectionCounts.set(bestMoveKey, (connectionCounts.get(bestMoveKey) || 0) + 1);
    }

    async function updateProgressUI(current, total) {
        generationProgress.value = current;
        progressText.textContent = `${current} / ${total}`;
        // Yield to browser to prevent freezing
        await new Promise(resolve => requestAnimationFrame(resolve));
    }


    async function calculateColorDistribution(imageData, paletteColors, width, height, center, radiusSq, dominanceThreshold = 0) {
        const distribution = {};
        let totalClosestPixels = 0;
        paletteColors.forEach(c => distribution[c.join(',')] = 0);

        const pixelsPerChunk = 25000; // Process in chunks to avoid freezing the browser
        let processedInChunk = 0;

        // Introduce sampling to drastically reduce the number of pixels to check
        const step = Math.max(1, Math.floor(width / 250));

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const dx = x - center.x;
                const dy = y - center.y;
                if (dx * dx + dy * dy <= radiusSq) {
                    const idx = (y * width + x) * 4;
                    const pixelColor = [imageData[idx], imageData[idx+1], imageData[idx+2]];

                    // ---- Dominance threshold filter ----
                    if (dominanceThreshold > 0) {
                        const [r, g, b] = pixelColor;
                        const maxVal = Math.max(r, g, b);
                        let secondMax;
                        if (maxVal === r) {
                            secondMax = Math.max(g, b);
                        } else if (maxVal === g) {
                            secondMax = Math.max(r, b);
                        } else {
                            secondMax = Math.max(r, g);
                        }
                        if ((maxVal - secondMax) < dominanceThreshold) {
                            continue; // Pixel is not sufficiently dominated by a single channel
                        }
                    }

                    let minDist = Infinity;
                    let closestPaletteColor = null;
                    for (const paletteColor of paletteColors) {
                        const dist = colorDistance(pixelColor, paletteColor);
                        if (dist < minDist) {
                            minDist = dist;
                            closestPaletteColor = paletteColor;
                        }
                    }

                    if (closestPaletteColor) {
                        distribution[closestPaletteColor.join(',')]++;
                        totalClosestPixels++;
                    }

                    processedInChunk++;
                    if (processedInChunk >= pixelsPerChunk) {
                        await new Promise(resolve => setTimeout(resolve, 0)); // Yield to main thread
                        processedInChunk = 0;
                    }
                }
            }
        }

        // Normalize the distribution; if none qualified fall back to equal splits
        if (totalClosestPixels > 0) {
            for (const colorKey in distribution) {
                distribution[colorKey] /= totalClosestPixels;
            }
        } else {
            const equal = 1 / paletteColors.length;
            for (const colorKey in distribution) {
                distribution[colorKey] = equal;
            }
        }
        
        return distribution;
    }


    function calculateSimilarity(target, current, width, height) {
        const radius = width / 2;
        const radiusSq = radius * radius;
        const center = { x: radius, y: radius };
        
        let totalSimilarity = 0;
        let pixelCount = 0;
        const maxPixelDiff = Math.sqrt(3 * (255 ** 2)); // Max distance between black (0,0,0) and white (255,255,255)

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - center.x;
                const dy = y - center.y;
                if (dx * dx + dy * dy <= radiusSq) {
                    const idx = (y * width + x) * 4;
                    const tR = target[idx], tG = target[idx + 1], tB = target[idx + 2];
                    const cR = current[idx], cG = current[idx + 1], cB = current[idx + 2];
                    
                    // Calculate Euclidean distance for colors. This captures color difference, not just brightness.
                    const diff = Math.sqrt((tR - cR)**2 + (tG - cG)**2 + (tB - cB)**2);
                    
                    // Calculate this pixel's similarity score (0 to 1)
                    const pixelSimilarity = 1 - (diff / maxPixelDiff);
                    
                    totalSimilarity += pixelSimilarity;
                    pixelCount++;
                }
            }
        }
        
        if (pixelCount === 0) return 100;

        // The final score is the average of all individual pixel similarities
        const averageSimilarity = totalSimilarity / pixelCount;
        return Math.max(0, averageSimilarity * 100);
    }

    function drawSimilarityGraph() {
        const w = similarityGraphCanvas.width;
        const h = similarityGraphCanvas.height;
        similarityGraphCtx.fillStyle = '#f9f9f9';
        similarityGraphCtx.fillRect(0, 0, w, h);

        if (similarityHistory.length < 2) return;
        
        const numLines = parseInt(sliders.lines.value, 10);
        const startSimilarity = similarityHistory[0];
        const maxSimilarity = Math.max(...similarityHistory);
        const yAxisTop = Math.min(100, Math.ceil(maxSimilarity / 5) * 5 + 5); // Go up to the next 5% interval, or 100
        const yRange = yAxisTop - startSimilarity;

        similarityGraphCtx.strokeStyle = '#007bff';
        similarityGraphCtx.lineWidth = 2;
        similarityGraphCtx.beginPath();
        
        for (let i = 0; i < similarityHistory.length; i++) {
            const x = (i / (numLines - 1)) * w;
            const y = (yRange > 0.1) ? h - ((similarityHistory[i] - startSimilarity) / yRange) * h : h;
            if (i === 0) {
                similarityGraphCtx.moveTo(x, y);
            } else {
                similarityGraphCtx.lineTo(x, y);
            }
        }
        similarityGraphCtx.stroke();

        // Draw Axes and Labels
        similarityGraphCtx.fillStyle = '#666';
        similarityGraphCtx.font = '12px Arial';
        similarityGraphCtx.textAlign = 'left';
        similarityGraphCtx.fillText(`${Math.round(startSimilarity)}%`, 5, h - 5);
        similarityGraphCtx.textAlign = 'right';
        similarityGraphCtx.fillText(`${Math.round(yAxisTop)}%`, w - 5, 15);
    }
    
    function calculateScoreForPath(pixels, targetData, currentData, threadColor, lineOpacity, center, radiusSq) {
        // Normalise score so that longer lines are not unfairly favoured.
        // We accumulate the error reduction for every pixel the line covers
        // (restricted to the circular area of the artwork) and then return
        // the AVERAGE improvement instead of the raw sum.

        let currentError = 0;
        let nextError    = 0;
        let pixelCount   = 0;

        // Derive the canvas width from the data length. The artwork is always rendered
        // on a square canvas (width === height) so we can safely take the square-root.
        const w = Math.round(Math.sqrt(targetData.length / 4));

        const [sR, sG, sB] = threadColor;   // threadColor is an RGB array e.g. [255,0,0]
        const alpha = lineOpacity;          // Already in the range 0-1

        for (const p of pixels) {
            // Skip pixels that lie outside the circular working area
            const dx = p.x - center.x;
            const dy = p.y - center.y;
            if ((dx * dx + dy * dy) > radiusSq) continue;

            const idx = (p.y * w + p.x) * 4;

            const tR = targetData[idx];
            const tG = targetData[idx + 1];
            const tB = targetData[idx + 2];

            const cR = currentData[idx];
            const cG = currentData[idx + 1];
            const cB = currentData[idx + 2];

            // Error before drawing the line pixel
            currentError += (tR - cR) ** 2 + (tG - cG) ** 2 + (tB - cB) ** 2;

            // Blended colour after drawing the line pixel
            const nR = sR * alpha + cR * (1 - alpha);
            const nG = sG * alpha + cG * (1 - alpha);
            const nB = sB * alpha + cB * (1 - alpha);

            // Error after drawing this pixel
            nextError += (tR - nR) ** 2 + (tG - nG) ** 2 + (tB - nB) ** 2;

            pixelCount++;
        }

        // If, for some reason, no pixels were considered (should be rare),
        // return a very low score so the move is ignored.
        if (pixelCount === 0) return -Infinity;

        const errorReduction = currentError - nextError;

        // Apply chosen normalisation mode
        switch (normalizationMode) {
            case 'none':
                return errorReduction; // raw sum of improvements
            case 'logarithmic':
                const maxPixels = Math.PI * radiusSq; // total pixels in disc (approx.)
                const lengthBoost = 1 + Math.log1p(pixelCount) / Math.log1p(maxPixels);
                return (errorReduction / pixelCount) * lengthBoost;
            case 'average':
            default:
                return errorReduction / pixelCount;
        }
    }


    // --- Color Analysis Functions ---

    async function analyzeAverageBackgroundColor() {
        if (!sourceImage) {
            alert('Please upload an image first.');
            return;
        }

        const btn = analyzeAverageBtn;
        const originalText = btn.textContent;
        toggleControls(true);
        btn.textContent = 'Analyzing...';
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            console.time('Average Background Analysis');
            const imagePixels = getCircularImageData(sourceCanvas);
            if (imagePixels.length === 0) {
                alert("Could not find image data. Please make sure an image is loaded.");
                return;
            }

            const backgroundRgb = findAverageColor(imagePixels);
            const backgroundHex = `#${backgroundRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
            
            if (hasGenerated) {
                hasGenerated = false;
                pinSequence = [];
            }
            currentBackgroundColor = backgroundHex;
            backgroundColorPicker.value = backgroundHex;
            updatePreviewBackgroundAndPins();

            console.timeEnd('Average Background Analysis');
        } catch (error) {
            console.error("An error occurred during average color analysis:", error);
            alert("An error occurred during average color analysis. Check the console for details.");
        } finally {
            toggleControls(false);
            btn.textContent = originalText;
        }
    }


    async function analyzeBinnedBackgroundColor() {
        if (!sourceImage) {
            alert('Please upload an image first.');
            return;
        }

        const btn = analyzeBinnedBtn;
        const originalText = btn.textContent;
        toggleControls(true);
        btn.textContent = 'Analyzing...';
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            console.time('Binned Background Analysis');
            const imagePixels = getCircularImageData(sourceCanvas);
            if (imagePixels.length === 0) {
                alert("Could not find image data. Please make sure an image is loaded.");
                return;
            }

            const backgroundRgb = findMostCommonColor(imagePixels, binnedBackgroundPrecision);
            const backgroundHex = `#${backgroundRgb.map(c => c.toString(16).padStart(2, '0')).join('')}`;
            
            if (hasGenerated) {
                hasGenerated = false;
                pinSequence = [];
            }
            currentBackgroundColor = backgroundHex;
            backgroundColorPicker.value = backgroundHex;
            updatePreviewBackgroundAndPins();

            binnedBackgroundPrecision = (binnedBackgroundPrecision % 10) + 1;
            updateBinnedPrecisionText();

            console.timeEnd('Binned Background Analysis');
        } catch (error) {
            console.error("An error occurred during binned background color analysis:", error);
            alert("An error occurred during binned background color analysis. Check the console for details.");
        } finally {
            toggleControls(false);
            btn.textContent = originalText;
        }
    }


    function analyzeSmartPalette() {
        if (!sourceImage) {
            alert('Please upload an image first.');
            return;
        }
        const mode = paletteModeSelector.value;
        if (mode === 'smart') {
            analyzeSmartPaletteFromPixels();
        } else if (mode === 'smart-lines') {
            analyzeSmartPaletteFromLines();
        }
    }

    function getLineAverageColor(p1, p2, canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const linePixels = getLinePixels(p1, p2, canvas.width, canvas.height);
        
        if (linePixels.length === 0) return null;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (const pixel of linePixels) {
            const idx = (pixel.y * canvas.width + pixel.x) * 4;
            // Only consider opaque pixels
            if (imageData[idx + 3] > 128) {
                r += imageData[idx];
                g += imageData[idx + 1];
                b += imageData[idx + 2];
                count++;
            }
        }

        if (count === 0) return null;

        return [r / count, g / count, b / count];
    }

    async function analyzeSmartPaletteFromLines() {
        const btn = document.getElementById('analyzePaletteBtn');
        const originalText = btn.textContent;
        toggleControls(true);
        btn.textContent = 'Analyzing Lines...';
        await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI to update

        try {
            console.time('Line-based Palette Analysis');
            updateSourceCanvas(); // Ensure the source canvas is up-to-date with transforms

            const allPins = getAllPins();
            if (allPins.length < 2) {
                alert("Not enough pins defined to analyze lines. Please increase pin count.");
                return;
            }

            const totalPossibleLines = (allPins.length * (allPins.length - 1)) / 2;
            const numSamples = Math.min(10000, totalPossibleLines);
            
            console.log(`Analyzing ${numSamples} of ${totalPossibleLines} possible lines.`);

            const lineAverageColors = [];
            
            if (numSamples === totalPossibleLines) {
                // Analyze all lines
                for (let i = 0; i < allPins.length; i++) {
                    for (let j = i + 1; j < allPins.length; j++) {
                        const avgColor = getLineAverageColor(allPins[i], allPins[j], sourceCanvas);
                        if (avgColor) lineAverageColors.push(avgColor);
                    }
                }
            } else {
                // Analyze a random sample
                const sampledPairs = new Set();
                while (lineAverageColors.length < numSamples && sampledPairs.size < totalPossibleLines) {
                    let i = Math.floor(Math.random() * allPins.length);
                    let j = Math.floor(Math.random() * allPins.length);
                    if (i === j) continue;
                    
                    // Ensure pair is unique (e.g. 1-5 is same as 5-1)
                    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                    if (sampledPairs.has(key)) continue;
                    
                    sampledPairs.add(key);
                    const avgColor = getLineAverageColor(allPins[i], allPins[j], sourceCanvas);
                    if (avgColor) lineAverageColors.push(avgColor);
                }
            }
            
            if (lineAverageColors.length === 0) {
                alert("Could not extract any line color data from the image.");
                return;
            }

            // --- Run k-means on the line average colors ---
            const numPaletteColors = parseInt(paletteColorsSlider.value, 10);
            
            if (lineAverageColors.length < numPaletteColors) {
                alert(`Not enough distinct line colors found to generate a ${numPaletteColors}-color palette.`);
                activePalette = lineAverageColors.map(p => p.map(Math.round));
            } else {
                const numCandidateColors = Math.max(numPaletteColors * 3, 15);
                const kMeansInput = lineAverageColors;
                const candidateClusters = kMeans(kMeansInput, Math.min(numCandidateColors, kMeansInput.length), 'kmeans++');
                const candidateColors = candidateClusters.map(c => c.centroid);

                const finalPalette = selectDiverseColors(candidateColors, numPaletteColors);
                activePalette = finalPalette.map(c => c.map(Math.round));
            }

            // Add Black and White to the generated palette if they don't already exist
            if (!activePalette.some(c => c[0] === 255 && c[1] === 255 && c[2] === 255)) {
                activePalette.push([255, 255, 255]);
            }
            if (!activePalette.some(c => c[0] === 0 && c[1] === 0 && c[2] === 0)) {
                activePalette.push([0, 0, 0]);
            }

            updatePaletteDisplay(activePalette);
            console.timeEnd('Line-based Palette Analysis');

        } catch (error) {
            console.error("An error occurred during line-based color palette analysis:", error);
            alert("An error occurred during line-based color palette analysis. Check the console for details.");
        } finally {
            toggleControls(false);
            btn.textContent = originalText;
        }
    }


    async function analyzeSmartPaletteFromPixels() {
        const btn = document.getElementById('analyzePaletteBtn');
        const originalText = btn.textContent;
        toggleControls(true);
        btn.textContent = 'Analyzing Pixels...';
        await new Promise(resolve => setTimeout(resolve, 10)); // Allow UI to update

        try {
            console.time('Palette Analysis');
            const imagePixels = getCircularImageData(sourceCanvas);
            if (imagePixels.length === 0) {
                alert("Could not find image data. Please make sure an image is loaded.");
                return;
            }

            // --- Get current background color (manual or analyzed) ---
            const backgroundRgb = currentBackgroundColor.match(/\w\w/g).map(c => parseInt(c, 16));

            // --- Filter out background-like pixels ---
            const similarityThreshold = parseInt(foregroundThresholdSlider.value, 10);
            const foregroundPixels = imagePixels.filter(p => colorDistance(p, backgroundRgb) > similarityThreshold);

            // --- Run k-means on the remaining "foreground" pixels ---
            const numPaletteColors = parseInt(paletteColorsSlider.value, 10);
            
            if (foregroundPixels.length < numPaletteColors) {
                alert(`Not enough distinct foreground colors found to generate a ${numPaletteColors}-color palette. Try adjusting the Foreground Separation threshold.`);
                activePalette = foregroundPixels.map(p => p.map(Math.round));
            } else {
                const numCandidateColors = Math.max(numPaletteColors * 3, 15);
                const candidateClusters = kMeans(foregroundPixels, Math.min(numCandidateColors, foregroundPixels.length), 'kmeans++');
                const candidateColors = candidateClusters.map(c => c.centroid);

                const finalPalette = selectDiverseColors(candidateColors, numPaletteColors);
                activePalette = finalPalette.map(c => c.map(Math.round));
            }

            // Add Black and White to the generated palette if they don't already exist
            if (!activePalette.some(c => c[0] === 255 && c[1] === 255 && c[2] === 255)) {
                activePalette.push([255, 255, 255]);
            }
            if (!activePalette.some(c => c[0] === 0 && c[1] === 0 && c[2] === 0)) {
                activePalette.push([0, 0, 0]);
            }

            updatePaletteDisplay(activePalette);
            console.timeEnd('Palette Analysis');

        } catch (error) {
            console.error("An error occurred during color palette analysis:", error);
            alert("An error occurred during color palette analysis. Check the console for details.");
        } finally {
            toggleControls(false);
            btn.textContent = originalText;
        }
    }

    function getCircularImageData(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const radius = canvas.width / 2;
        const radiusSq = radius * radius;
        const center = { x: radius, y: radius };
        
        const pixels = [];
        // For performance, we can sample a subset of pixels, e.g., every 2nd pixel in each direction
        const step = Math.max(1, Math.floor(canvas.width / 250)); // Sample more on larger canvases

        for (let y = 0; y < canvas.height; y += step) {
            for (let x = 0; x < canvas.width; x += step) {
                const dx = x - center.x;
                const dy = y - center.y;
                if (dx * dx + dy * dy <= radiusSq) {
                    const i = (y * canvas.width + x) * 4;
                    if (data[i + 3] > 128) { // Only count opaque pixels
                       pixels.push([data[i], data[i+1], data[i+2]]);
                    }
                }
            }
        }
        return pixels;
    }

    function findAverageColor(pixels) {
        if (!pixels || pixels.length === 0) return [0, 0, 0];
        const sum = pixels.reduce((acc, p) => {
            acc[0] += p[0];
            acc[1] += p[1];
            acc[2] += p[2];
            return acc;
        }, [0, 0, 0]);
        return [
            Math.round(sum[0] / pixels.length),
            Math.round(sum[1] / pixels.length),
            Math.round(sum[2] / pixels.length)
        ];
    }

    function findMostCommonColor(pixels, quant) { // quant is the bit shift value, e.g. 4
        const histogram = new Map();

        for (const pixel of pixels) {
            const r = pixel[0], g = pixel[1], b = pixel[2];
            
            // Quantize colors to group them into bins
            const r_q = r >> quant;
            const g_q = g >> quant;
            const b_q = b >> quant;
            const key = `${r_q},${g_q},${b_q}`;

            const entry = histogram.get(key);
            if (entry) {
                entry.count++;
                entry.sumR += r;
                entry.sumG += g;
                entry.sumB += b;
            } else {
                histogram.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
            }
        }

        let maxCount = 0;
        let dominantBin = null;
        for (const bin of histogram.values()) {
            if (bin.count > maxCount) {
                maxCount = bin.count;
                dominantBin = bin;
            }
        }

        if (dominantBin) {
            return [
                Math.round(dominantBin.sumR / dominantBin.count),
                Math.round(dominantBin.sumG / dominantBin.count),
                Math.round(dominantBin.sumB / dominantBin.count),
            ];
        }
        return [0, 0, 0]; // Fallback
    }

    function updatePaletteDisplay(palette) {
        paletteDisplay.innerHTML = '';
        if (!palette || palette.length === 0) {
            paletteDisplay.innerHTML = '<span style="font-size: 0.85rem; color: #888;">Analyze image to generate.</span>';
            return;
        }
        
        palette.forEach((colorRgb, index) => {
            const swatchContainer = document.createElement('div');
            swatchContainer.className = 'palette-swatch-container';

            const swatch = document.createElement('div');
            swatch.className = 'palette-swatch';
            swatch.style.backgroundColor = `rgb(${colorRgb.join(',')})`;
            swatch.title = `rgb(${colorRgb.join(',')})`;

            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-swatch-btn';
            removeBtn.innerHTML = '&times;'; // 'x' character
            removeBtn.title = 'Remove color';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                activePalette.splice(index, 1);
                updatePaletteDisplay(activePalette);
            };

            swatchContainer.appendChild(swatch);
            swatchContainer.appendChild(removeBtn);
            paletteDisplay.appendChild(swatchContainer);
        });
    }

    function selectDiverseColors(colors, count) {
        if (colors.length <= count) {
            return colors.map(c => c.map(Math.round));
        }

        const palette = [];
        const remainingColors = [...colors];

        // 1. Pick the first color (can be the first in the list)
        palette.push(remainingColors.splice(0, 1)[0]);

        while (palette.length < count && remainingColors.length > 0) {
            let maxDist = -1;
            let bestCandidateIndex = -1;

            // For each remaining candidate...
            for (let i = 0; i < remainingColors.length; i++) {
                const candidate = remainingColors[i];
                let min_dist_to_palette = Infinity;

                // ...find its minimum distance to any color already in the palette
                for (const p_color of palette) {
                    const dist = colorDistance(candidate, p_color);
                    if (dist < min_dist_to_palette) {
                        min_dist_to_palette = dist;
                    }
                }

                // We want the candidate whose minimum distance to the palette is the largest
                if (min_dist_to_palette > maxDist) {
                    maxDist = min_dist_to_palette;
                    bestCandidateIndex = i;
                }
            }
            
            // Add the best candidate to the palette and remove it from remaining colors
            if (bestCandidateIndex !== -1) {
                palette.push(remainingColors.splice(bestCandidateIndex, 1)[0]);
            } else {
                // This should not happen if remainingColors is not empty, but as a fallback:
                break;
            }
        }

        return palette;
    }

    // --- Geometry & Pathing Functions ---

    function buildParametersString() {
        return `Color String Art Generation Parameters
---------------------------------
Date: ${getFormattedDateTime()}
Source Image: ${imageLoader.files.length > 0 ? imageLoader.files[0].name : 'N/A'}

Artwork Parameters:
- Background Color: ${currentBackgroundColor}
- Resolution: ${currentResolution}x${currentResolution}
- Number of Pins: ${sliders.pins.value}
- Number of Lines: ${sliders.lines.value}
- Pin Diameter: ${sliders.pinDiameter.value} mm
- Line Opacity: ${sliders.opacity.value}%
- Estimated Total String Length: ${(totalStringLengthMm / 1000).toFixed(2)} m

Image Pre-processing:
- Brightness: ${sliders.brightness.value}, Contrast: ${sliders.contrast.value}
---------------------------------

Pin Sequence (Thread: From Pin -> To Pin):
`;
    }

    function buildSequenceString() {
        if (pinSequence.length === 0) return "No sequence generated.";
        
        // The first move's "from" is just the starting pin, no direction involved yet.
        const firstStep = pinSequence[0];
        let sequenceText = `1. ${firstStep.thread}: ${formatPinIdentifier(firstStep.from, null)} -> ${formatPinIdentifier(firstStep.to, firstStep.wrap)}\n`;

        for (let i = 1; i < pinSequence.length; i++) {
            const step = pinSequence[i];
            const prevStep = pinSequence[i-1];
            // The 'from' pin of the current step is the 'to' pin of the previous step.
            // The wrap direction for this 'from' pin is the one we determined when leaving it in the previous step.
            const fromPinFormatted = formatPinIdentifier(step.from, prevStep.wrap);
            const toPinFormatted = formatPinIdentifier(step.to, step.wrap);
            sequenceText += `${i + 1}. ${step.thread}: ${fromPinFormatted} -> ${toPinFormatted}\n`;
        }
        return sequenceText;
    }

    function formatPinIdentifier(pin, wrapDirection) {
        if (!pin) return 'N/A';

        let formattedId;

        if (pin.type === 'C') {
            formattedId = 'C';
        } else if (pin.type === 'M') {
            formattedId = `M-${pin.num}`;
        } else { // 'O'
            formattedId = pin.num.toString();
        }
        
        if (wrapDirection) {
            const directionSuffix = wrapDirection === 'Clockwise' ? 'C' : 'A';
            return `${formattedId}-${directionSuffix}`;
        }

        return formattedId; // For the very first starting pin.
    }

    // --- New Download & Formatting Functions (Replaces old downloadResults and builders) ---

    function rgbToHex(r, g, b) {
        if (r === undefined || g === undefined || b === undefined) return '#000000';
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    let HEX_TO_NAME_MAP;
    function initializeColorMaps() {
        if (HEX_TO_NAME_MAP) return;
        HEX_TO_NAME_MAP = new Map();
        // These global variables come from config.js
        const palettes = [
            classicThreads, extendedClassicThreads, blackAndWhiteThreads, blackThreads,
            whiteThreads, lowSaturationThreads, superExtendedThreads, greyscaleThreads, vibrantThreads
        ];
        for (const palette of palettes) {
            for (const item of palette) {
                const hex = rgbToHex(...item.color);
                if (!HEX_TO_NAME_MAP.has(hex)) {
                    HEX_TO_NAME_MAP.set(hex, item.name);
                }
            }
        }
    }

    function getColorName(hex) {
        initializeColorMaps();
        return HEX_TO_NAME_MAP.get(hex.toUpperCase()) || hex;
    }

    function readAllSettings() {
        const settings = {};
        settings['Date'] = getFormattedDateTime();
        settings['Source Image'] = imageLoader.files.length > 0 ? imageLoader.files[0].name : 'N/A';
        
        settings['\n--- Image Settings ---'] = '';
        settings['Brightness'] = sliders.brightness.value;
        settings['Contrast'] = sliders.contrast.value;
        settings['Saturation'] = sliders.saturation.value;

        settings['\n--- String Art Parameters ---'] = '';
        settings['Resolution'] = resolutionSelector.value + 'x' + resolutionSelector.value;
        settings['Artwork Diameter (cm)'] = sliders.artDiameter.value;
        settings['Number of Pins'] = sliders.pins.value;
        settings['Number of Lines'] = sliders.lines.value;
        settings['Line Opacity (%)'] = sliders.opacity.value;
        settings['Min Pin Distance'] = sliders.minPinDistance.value;
        settings['Pin Diameter (mm)'] = sliders.pinDiameter.value;
        settings['Enable Central Pin'] = centralPinEnabledCheckbox.checked;
        settings['Enable Middle Pins'] = middlePinsEnabledCheckbox.checked;
        
        if (middlePinsEnabledCheckbox.checked) {
            settings['Number of Middle Pins'] = middlePinsSlider.value;
            settings['Middle Pin Distance'] = middlePinDistanceSlider.value;
        }

        settings['\n--- Advanced ---'] = '';
        settings['Monochromatic Lines'] = sliders.monoLines.value;
        settings['Max Line Repeats'] = sliders.maxRepeats.value;
        settings['Generation Strategy'] = generationStrategySelector.value;
        
        if (generationStrategySelector.value === 'lookahead') {
            settings['Lookahead Sampling'] = lookaheadSamplingSlider.value;
        }
        
        settings['Enable Color Forcing'] = colorForcingEnabledCheckbox.checked;
        if (colorForcingEnabledCheckbox.checked) {
            settings['Forcing Percentage'] = colorForcingPercentageSlider.value;
            settings['RGB Dominance Threshold'] = dominanceThresholdSlider.value;
        }

        settings['\n--- Palette ---'] = '';
        settings['Background Color'] = backgroundColorPicker.value;
        const paletteMode = paletteModeSelector.value;
        settings['Palette Type'] = paletteMode;

        if (paletteMode === 'smart' || paletteMode === 'smart-lines') {
            settings['Num Palette Colors'] = paletteColorsSlider.value;
            if (paletteMode === 'smart') {
                settings['Foreground Separation'] = foregroundThresholdSlider.value;
            }
            settings['Generated Palette (RGB)'] = activePalette.map(c => `[${c.join(',')}]`).join('; ');
        } else if (paletteMode === 'custom') {
            const customColors = Array.from(customPalettePickerContainer.querySelectorAll('input[type="color"]')).map(picker => picker.value);
            settings['Custom Colors (Hex)'] = customColors.join(', ');
        }

        settings['\n--- Generation Stats ---'] = '';
        settings['Final Similarity Score'] = similarityScore.textContent;
        settings['Total Lines Generated'] = pinSequence.length;
        settings['Total Thread Length (m)'] = (totalStringLengthMm / 1000).toFixed(2);
        
        return settings;
    }

    async function downloadResults() {
        if (!hasGenerated || pinSequence.length === 0) {
            alert('Please generate the artwork first before downloading.');
            return;
        }

        const zip = new JSZip();

        // 1. Build CSV content
        let csvContent = "";
        
        // Add parameters to the top of the CSV
        const settings = readAllSettings();
        csvContent += "String Art Generation Parameters\n";
        for (const [key, value] of Object.entries(settings)) {
             if(key.startsWith('---')) {
                csvContent += `${key.replace(/---/g, '')}\n`;
            } else {
                csvContent += `"${key}": "${value}"\n`;
            }
        }
        csvContent += "\n";

        // Add sequence data
        const headers = ["Step", "FromPin", "ToPin", "ColorHex", "ColorName"];
        csvContent += headers.join(',') + '\n';

        let prevStep = null;
        pinSequence.forEach((step, index) => {
            const fromPinId = formatPinIdentifier(step.from, prevStep ? prevStep.wrap : null);
            const toPinId = formatPinIdentifier(step.to, step.wrap);
            const colorHex = rgbToHex(...step.threadColor);
            const colorName = getColorName(colorHex);

            const row = [
                index + 1,
                fromPinId,
                toPinId,
                colorHex,
                colorName
            ];
            csvContent += row.map(val => `"${val}"`).join(',') + '\n';
            prevStep = step;
        });

        zip.file('instructions.csv', csvContent);

        // 2. Add Artwork (final result)
        const artBlob = await new Promise(resolve => previewCanvas.toBlob(resolve, 'image/png'));
        zip.file('artwork.png', artBlob);
        
        // 3. Add Processed Source Image
        const sourceBlob = await new Promise(resolve => sourceCanvas.toBlob(resolve, 'image/png'));
        zip.file('processed_image.png', sourceBlob);

        // 4. Add similarity graph
        if (statsContainer.style.display !== 'none' && similarityHistory.length > 1) {
            const graphBlob = await new Promise(resolve => similarityGraphCanvas.toBlob(resolve, 'image/png'));
            zip.file('similarity_graph.png', graphBlob);
        }

        // 5. Generate and Trigger Download
        const zipBlob = await zip.generateAsync({type:"blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `StringArt_Results_${getFormattedDateTime()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
    
    // --- Run ---
    updateResolution(parseInt(resolutionSelector.value, 10));
    updateMonoLinesSliderMax();
    initializeCanvases();
    updateEstimatedThreadThickness();

    function addCustomColorPicker(color = null) {
        const defaultColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000', '#ff8800', '#8800ff'];
        
        const container = document.createElement('div');
        container.className = 'palette-swatch-container';

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.className = 'palette-swatch'; // Re-use styling
        colorPicker.value = color || defaultColors[customPalettePickerContainer.children.length % defaultColors.length];
        
        const removeBtn = document.createElement('span');
        removeBtn.className = 'remove-swatch-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove color';
        removeBtn.onclick = () => {
            container.remove();
        };

        container.appendChild(colorPicker);
        container.appendChild(removeBtn);
        customPalettePickerContainer.appendChild(container);
    }

    function updateCustomPalettePickers() {
        customPalettePickerContainer.innerHTML = ''; // Clear existing
        const initialColors = ['#ff0000', '#00ff00', '#0000ff', '#000000', '#ffffff'];
        initialColors.forEach(color => addCustomColorPicker(color));
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

    function updateEstimatedThreadThickness() {
        if (!estimatedThreadThickness) return;

        const artDiameterCm = parseFloat(sliders.artDiameter.value);
        const resolution = parseInt(resolutionSelector.value, 10);
        const lineOpacity = parseInt(sliders.opacity.value, 10) / 100;

        if (isNaN(artDiameterCm) || isNaN(resolution) || isNaN(lineOpacity) || resolution === 0) {
            estimatedThreadThickness.textContent = '...';
            return;
        }

        const artDiameterMm = artDiameterCm * 10;
        const mmPerPixel = artDiameterMm / resolution;
        const thicknessMm = lineOpacity * mmPerPixel;

        estimatedThreadThickness.textContent = thicknessMm.toFixed(2);
    }
});