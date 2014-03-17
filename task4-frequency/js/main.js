$(window).load(function () {
    var canvas = $('#source')[0],
        canvasNoise = $('#source-with-noise')[0],
        outputCanvas = $('#output')[0],
        outputCanvas2 = $('#output2')[0],
        outputCanvas3 = $('#output3')[0],
        context = canvas.getContext('2d'),
        $sourceImage = $('#source-image'),
        i;

    $sourceImage.one('load', function() {
        canvas.width = $sourceImage.width();
        canvas.height = $sourceImage.height();

        canvasNoise.width = canvas.width;
        canvasNoise.height = canvas.height;

        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        outputCanvas2.width = canvas.width;
        outputCanvas2.height = canvas.height;
        outputCanvas3.width = canvas.width;
        outputCanvas3.height = canvas.height;

        context.drawImage($sourceImage[0], 0, 0);

        var $radiusILPFslider = $('#radius-ilpf'),
            $radiusIHPFslider = $('#radius-ihpf'),
            $radiusGLPFslider = $('#radius-glpf'),
            $radiusBHPFslider = $('#radius-bhpf'),
            $noiseAmount = $('#noise-amount'),
            $noiseIntensity = $('#noise-intensity'),
            $radiusILPFsliderLabel = $('label[for="radius-ilpf"]'),
            $radiusIHPFsliderLabel = $('label[for="radius-ihpf"]'),
            $radiusGLPFsliderLabel = $('label[for="radius-glpf"]'),
            $radiusBHPFsliderLabel = $('label[for="radius-bhpf"]'),
            $noiseAmountLabel = $('label[for="noise-amount"]'),
            $noiseIntensityLabel = $('label[for="noise-intensity"]'),
            radiusILPF = 90,
            radiusIHPF = 25,
            radiusGLPF = 50,
            radiusBHPF = 25,
            noiseAmount = 0.1,
            noiseIntensity = 100;

        var refreshNoise = function () {
            noise(canvas, canvasNoise, noiseAmount, noiseIntensity);
            $('#noise')[0].src = canvasNoise.toDataURL();
        };

        var computeILPF = function() {
            filterImage(canvasNoise, outputCanvas, outputCanvas2, idealFilter, [radiusILPF, false]);
            $('#output-image1-1')[0].src = outputCanvas.toDataURL();
            $('#output-image1-2')[0].src = outputCanvas2.toDataURL();
        };

        var computeIHPF = function() {
            filterImage(canvasNoise, outputCanvas, outputCanvas2, idealFilter, [radiusIHPF, true]);
            $('#output-image2-1')[0].src = outputCanvas.toDataURL();
            $('#output-image2-2')[0].src = outputCanvas2.toDataURL();
        };

        var computeGLPF = function() {
            filterImage(canvasNoise, outputCanvas, outputCanvas2, gaussianFilter, [radiusGLPF, 0]);
            $('#output-image3-1')[0].src = outputCanvas.toDataURL();
            $('#output-image3-2')[0].src = outputCanvas2.toDataURL();
        };

        var computeBHPF = function() {
            filterImage(canvasNoise, outputCanvas, outputCanvas2, butterworthFilter, [radiusBHPF, 2, 1]);
            $('#output-image4-1')[0].src = outputCanvas.toDataURL();
            $('#output-image4-2')[0].src = outputCanvas2.toDataURL();
        };

        $noiseAmount.on('change', function () {
            noiseAmount = parseFloat($noiseAmount.val());
            $noiseAmountLabel.text('Noise amount = ' + noiseAmount);
            refreshNoise();
            computeILPF();
            computeIHPF();
            computeGLPF();
            computeBHPF();
        });

        $noiseIntensity.on('change', function () {
            noiseIntensity = parseInt($noiseIntensity.val(), 10);
            $noiseIntensityLabel.text('Noise intensity = ' + noiseIntensity);
            refreshNoise();
            computeILPF();
            computeIHPF();
            computeGLPF();
            computeBHPF();
        });

        $radiusILPFslider.on('change', function () {
            radiusILPF = parseInt($radiusILPFslider.val(), 10);
            $radiusILPFsliderLabel.text('ILPF radius = ' + radiusILPF);
            computeILPF();
        });

        $radiusIHPFslider.on('change', function () {
            radiusIHPF = parseInt($radiusIHPFslider.val(), 10);
            $radiusIHPFsliderLabel.text('IHPF radius = ' + radiusIHPF);
            computeIHPF();
        });

        $radiusGLPFslider.on('change', function () {
            radiusGLPF = parseInt($radiusGLPFslider.val(), 10);
            $radiusGLPFsliderLabel.text('GLPF radius = ' + radiusGLPF);
            computeGLPF();
        });

        $radiusBHPFslider.on('change', function () {
            radiusBHPF = parseInt($radiusBHPFslider.val(), 10);
            $radiusBHPFsliderLabel.text('BHPF radius = ' + radiusBHPF);
            computeBHPF();
        });

        /*refreshNoise();
        computeILPF();
        computeIHPF();
        computeGLPF();
        computeBHPF();*/
        $('input').trigger('change');

    }).each(function() {
        if(this.complete) $(this).load();
    });
});

/**
 * Apply filter on the image
 */
function filterImage(sourceCanvas, resultCanvas, spectrumCanvas, filter, filterParams) {
    var source = sourceCanvas.getContext('2d'),
        spectrum = spectrumCanvas.getContext('2d'),
        result = resultCanvas.getContext('2d');

    var width = sourceCanvas.width,
        height = sourceCanvas.height,
        re = [],
        im = [];

    FFT.init(width);
    FrequencyFilter.init(width);
    SpectrumViewer.init(spectrum);

    var src = source.getImageData(0, 0, width, height),
        data = src.data;

    //Get real and imaginary parts
    computeReIm(data, re, im);

    //2D-FFT
    FFT.fft2d(re, im);

    //Move 0 frequency to center
    FrequencyFilter.swap(re, im);

    //Apply filter
    filter.apply(null, [re, im].concat(filterParams));

    // render spectrum
    SpectrumViewer.render(re, im, true);

    //Move 0 frequency to corners
    FrequencyFilter.swap(re, im);

    //2D-IFFT
    FFT.ifft2d(re, im);

    //Set data to have new real part values
    setDataFromRe(data, re);

    result.putImageData(src, 0, 0);
}

/**
 * Get real and imaginary parts from data
 */
function computeReIm(data, re, im) {
    var x, y, rowIndex,
        w = Math.sqrt(data.length / 4),
        h = w;
    for (y = 0; y < h; y++) {
        rowIndex = y * w;
        for (x = 0; x < w; x++) {
            re[rowIndex + x] = data[4 * (rowIndex + x)];
            im[rowIndex + x] = 0.0;
        }
    }
}

/**
 * Set real part values to data
 */
function setDataFromRe(data, re) {
    var x, y, rowIndex, pixelCoord, val,
        w = Math.sqrt(data.length / 4),
        h = w;
    for (y = 0; y < h; y++) {
        rowIndex = y * w;
        for(x = 0; x < w; x++) {
            val = re[rowIndex + x];
            pixelCoord = 4 * (rowIndex + x);
            data[pixelCoord] = data[pixelCoord + 1] = data[pixelCoord + 2] = val;
        }
    }
}

/**
 * Apply ideal filter on 2d spectrum data
 */
function idealFilter(re, im, radius, isHP) {
    var len = re.length,
        width = Math.sqrt(len),
        height = len / width,
        centerX = width / 2,
        centerY = height / 2,
        x, y, rowIndex, pixelDistance;

    for (y = 0; y < height; y++) {
        rowIndex = y * width;
        for (x = 0; x < width; x++) {
            pixelDistance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            if (isHP && pixelDistance < radius || !isHP && pixelDistance > radius) {
                re[rowIndex + x] = 0;
                im[rowIndex + x] = 0;
            }
        }
    }
}

/**
 * Apply Butterworth filter on 2d spectrum data
 */
function butterworthFilter(re, im, radius, order, isHP) {
    var len = re.length,
        width = Math.sqrt(len),
        height = len / width,
        centerX = width / 2,
        centerY = height / 2,
        x, y, rowIndex, pixelDistance, filterValue;

    if (radius > 0 && isHP || !isHP) {
        for (y = 0; y < height; y++) {
            rowIndex = y * width;
            for (x = 0; x < width; x++) {
                pixelDistance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                if (isHP) {
                    filterValue = 1 / (1 + Math.pow(radius / pixelDistance, 2 * order));
                } else {
                    filterValue = 1 / (1 + Math.pow(pixelDistance / radius, 2 * order));
                }

                re[rowIndex + x] *= filterValue;
                im[rowIndex + x] *= filterValue;
            }
        }
    }
}

/**
 * Apply Gaussian filter on 2d spectrum data
 */
function gaussianFilter(re, im, radius, isHP) {
    var len = re.length,
        width = Math.sqrt(len),
        height = len / width,
        centerX = width / 2,
        centerY = height / 2,
        x, y, rowIndex, pixelDistance, filterValue;

    for (y = 0; y < height; y++) {
        rowIndex = y * width;
        for (x = 0; x < width; x++) {
            pixelDistance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            if (isHP) {
                filterValue = 1 - Math.exp(-Math.pow(pixelDistance, 2) / (2 * Math.pow(radius, 2)));
            } else {
                filterValue = Math.exp(-Math.pow(pixelDistance, 2) / (2 * Math.pow(radius, 2)));
            }

            re[rowIndex + x] *= filterValue;
            im[rowIndex + x] *= filterValue;
        }
    }
}

/**
 * Add noise to the image
 */
function noise(sourceCanvas, resultCanvas, amount, intensity) {
    amount = amount || 0;
    intensity = intensity || 0;

    var matrixData = getImageMatrix(sourceCanvas);

    var width = matrixData[0].length,
        height = matrixData.length,
        i, x, y,
        newValue;

    if (amount) {
        for (i = 0; i < width * height; i++) {
            var addNoise = Math.random() < amount;

            if (addNoise) {
                x = i % width;
                y = Math.floor(i / width);
                newValue = matrixData[y][x] + Math.round(Math.random() * intensity);
                matrixData[y][x] = newValue;
            }
        }
    }

    drawImageFromMatrix(matrixData, resultCanvas);
}

/**
 * Get grayscale image matrix
 */
function getImageMatrix(sourceCanvas) {
    var sourceContext = sourceCanvas.getContext('2d'),
        sourceData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height),
        width = sourceCanvas.width,
        height = sourceCanvas.height,
        result = [],
        x, y;
    for (y = 0; y < height; y++) {
        result[y] = [];
        for (x = 0; x < width; x++) {
            result[y][x] = sourceData.data[4 * (y * width + x)];
        }
    }
    return result;
}

/**
 * Draw grayscale image data on canvas
 */
function drawImageFromMatrix(matrixData, resultCanvas) {
    var width = matrixData[0].length,
        height = matrixData.length;

    resultCanvas.width = width;
    resultCanvas.height = height;

    var resultContext = resultCanvas.getContext('2d'),
        result = resultContext.createImageData(width, height),
        x, y, pixelCoord, pixelValue;

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            pixelCoord = 4 * (y * width + x);
            pixelValue = matrixData[y][x];
            result.data[pixelCoord] = pixelValue;
            result.data[pixelCoord + 1] = pixelValue;
            result.data[pixelCoord + 2] = pixelValue;
            result.data[pixelCoord + 3] = 255;
        }
    }
    resultContext.putImageData(result, 0, 0);
}