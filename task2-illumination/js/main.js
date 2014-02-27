$(window).load(function () {
    var canvas = $('#source')[0],
        outputCanvas = $('#output')[0],
        context = canvas.getContext('2d'),
        $sourceImage = $('#source-image');

    $sourceImage.one('load', function() {
        canvas.width = $sourceImage.width();
        canvas.height = $sourceImage.height();
        context.drawImage($sourceImage[0], 0, 0);

        var sourceHistogram = {};
        var outputHistogram = {};

        //Original image
        Pixastic.process(canvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot'), sourceHistogram.values);

        //Power transformation
        imageGammaCorrection(canvas, outputCanvas, 1.5);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot1'), sourceHistogram.values);
        $('#output-image1')[0].src = outputCanvas.toDataURL();

        //Root transformation
        imageGammaCorrection(canvas, outputCanvas, 0.4);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot2'), sourceHistogram.values);
        $('#output-image2')[0].src = outputCanvas.toDataURL();

        //Log transformation
        imageLogarithmicCorrection(canvas, outputCanvas);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot3'), sourceHistogram.values);
        $('#output-image3')[0].src = outputCanvas.toDataURL();

        //Inverse log transformation
        imageInverseLogarithmicCorrection(canvas, outputCanvas);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot4'), sourceHistogram.values);
        $('#output-image4')[0].src = outputCanvas.toDataURL();

        //Histogram equalization
        imageHistogramEqualization(canvas, outputCanvas);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot5'), sourceHistogram.values);
        $('#output-image5')[0].src = outputCanvas.toDataURL();

        //Singular Value Equalization
        sve(canvas, outputCanvas);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot6'), sourceHistogram.values,
            {
                yaxis: {min: 0, max: 1500}
            });
        $('#output-image6')[0].src = outputCanvas.toDataURL();

        //Your own method for stretching the histogram of the luminance
        //Simple histogram stretching
        imageSimpleCorrection(canvas, outputCanvas, 1.5);
        Pixastic.process(outputCanvas, 'histogram', {returnValue: sourceHistogram});
        plotHistogram($('#plot7'), sourceHistogram.values);
        $('#output-image7')[0].src = outputCanvas.toDataURL();

    }).each(function() {
        if(this.complete) $(this).load();
    });
});

/**
 * Apply singular value equalization on the image
 */
function sve(sourceCanvas, resultCanvas) {
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;

    var matrixData = getImageMatrix(sourceCanvas);

    //get U S V
    var svd = numeric.svd(matrixData);

    //get U S V from random normal distribution array
    var goodSvd = numeric.svd(normalRandomMatrix(128, 1, resultCanvas.width, resultCanvas.height));

    //xi
    var multiplier = goodSvd.S[0] / svd.S[0];

    //we could calculate new image matrix, but it's the same as multiplying original matrix with multiplier (xi)
    //get new S by multiplying original S with multiplier (xi)
    //var newSigma = numeric.mul(svd.S, multiplier);

    //compute new image matrix
    //var newImageMatrix = numeric.dot(numeric.dot(svd.U, numeric.diag(newSigma)), numeric.transpose(svd.V));

    //drawImageFromMatrix(newImageMatrix, resultCanvas);

    //multiply original image matrix with multiplier (xi)
    drawImageFromMatrix(numeric.mul(matrixData, multiplier), resultCanvas);
}

/**
 * Apply histogram equalization on the image
 */
function imageHistogramEqualization(sourceCanvas, resultCanvas) {
    //get original image histogram
    var hist = {};
    Pixastic.process(sourceCanvas, 'histogram', {returnValue: hist});

    //compute cdf from histogram
    var cdf = calcCDF(hist.values);

    //compute new pixel values from cdf
    var newPixelValues = calcValuesFromCDF(cdf);

    drawImageFromPixelValues(newPixelValues, sourceCanvas, resultCanvas);
}

/**
 * Apply gamma correction on the image
 */
function imageGammaCorrection(sourceCanvas, resultCanvas, gamma) {
    var matrixData = getImageMatrix(sourceCanvas);

    //scale matrix values to [0, 1] and apply gamma correction
    var gammaCorrectedMatrix = gammaCorrection(numeric.div(matrixData, 255), gamma);

    //scale matrix values back to [0, 255] and draw image
    drawImageFromMatrix(numeric.mul(gammaCorrectedMatrix, 255), resultCanvas);
}

/**
 * Apply logarithmic correction on the image
 */
function imageLogarithmicCorrection(sourceCanvas, resultCanvas) {
    var matrixData = getImageMatrix(sourceCanvas);

    var logCorrectedMatrix = logCorrection(matrixData);

    drawImageFromMatrix(logCorrectedMatrix, resultCanvas);
}

/**
 * Apply inverse logarithmic correction on the image
 */
function imageInverseLogarithmicCorrection(sourceCanvas, resultCanvas) {
    var matrixData = getImageMatrix(sourceCanvas);

    var inverseLogCorrectedMatrix = inverseLogCorrection(matrixData);

    drawImageFromMatrix(inverseLogCorrectedMatrix, resultCanvas);
}

/**
 * Apply simple histogram stretching correction to the image
 */
function imageSimpleCorrection(sourceCanvas, resultCanvas) {
    var matrixData = getImageMatrix(sourceCanvas);

    var min = matrixMin(matrixData),
        max = matrixMax(matrixData),
        scale = 255 / (max - min);

    console.log('min', min);
    console.log('max', max);

    if (min > 0) {
        //subtract min from matrix elements to move histogram to left
        matrixData = numeric.sub(matrixData, min);
    }

    if (scale !== 1) {
        //multiply matrix values by scale to stretch histogram to right
        matrixData = numeric.mul(matrixData, scale);
    }

    console.log('newMin', matrixMin(matrixData));
    console.log('newMax', matrixMax(matrixData));

    //scale matrix values back to [0, 255] and draw image
    drawImageFromMatrix(matrixData, resultCanvas);
}

/**
 * Draw image by replacing source image pixel values
 */
function drawImageFromPixelValues(newPixelValues, sourceCanvas, resultCanvas) {
    var width = sourceCanvas.width,
        height = sourceCanvas.height;

    resultCanvas.width = width;
    resultCanvas.height = height;

    var sourceContext = sourceCanvas.getContext('2d'),
        resultContext = resultCanvas.getContext('2d'),
        sourceData = sourceContext.getImageData(0, 0, width, height).data,
        result = resultContext.createImageData(width, height),
        x, y, pixelCoord, pixelValue, sourcePixelValue;

    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            pixelCoord = 4 * (y * width + x);
            sourcePixelValue = sourceData[pixelCoord];
            pixelValue = newPixelValues[sourcePixelValue];
            result.data[pixelCoord] = pixelValue;
            result.data[pixelCoord + 1] = pixelValue;
            result.data[pixelCoord + 2] = pixelValue;
            result.data[pixelCoord + 3] = 255;
        }
    }
    resultContext.putImageData(result, 0, 0);
}

/**
 * Apply gamma correction on image matrix
 */

function gammaCorrection(matrixData, gamma) {
    var x, y,
        result = [];
    for (y = 0; y < matrixData.length; y++) {
        result[y] = [];
        for (x = 0; x < matrixData[0].length; x++) {
            result[y][x] = Math.pow(matrixData[y][x], gamma);
        }
    }
    return result;
}

/**
 * Apply log transformation on image matrix
 */
function logCorrection(matrixData) {
    var x, y,
        result = [],
        constant = 255 / Math.log(256);
    for (y = 0; y < matrixData.length; y++) {
        result[y] = [];
        for (x = 0; x < matrixData[0].length; x++) {
            result[y][x] = constant *  Math.log(1 + matrixData[y][x]);
        }
    }
    return result;
}

/**
 * Apply inverse log transformation on image matrix
 */
function inverseLogCorrection(matrixData) {
    var x, y,
        result = [],
        constant = 255 / Math.log(256);
    for (y = 0; y < matrixData.length; y++) {
        result[y] = [];
        for (x = 0; x < matrixData[0].length; x++) {
            result[y][x] = Math.exp(matrixData[y][x] / constant) - 1;
        }
    }
    return result;
}

/**
 * Finds minimum element value from matrix
 */
function matrixMin(matrixData) {
    var x, y,
        min = 255;
    for (y = 0; y < matrixData.length; y++) {
        for (x = 0; x < matrixData[0].length; x++) {
            if (matrixData[y][x] < min) {
                min = matrixData[y][x];
            }
            if (min === 0) {
                return min;
            }
        }
    }
    return min;
}

/**
 * Finds minimum element value from matrix
 */
function matrixMax(matrixData) {
    var x, y,
        max = 0;
    for (y = 0; y < matrixData.length; y++) {
        for (x = 0; x < matrixData[0].length; x++) {
            if (matrixData[y][x] > max) {
                max = matrixData[y][x];
            }
            if (max === 255) {
                return max;
            }
        }
    }
    return max;
}

/**
 * Calculate CDF values from histogram
 */
function calcCDF(histogramValues) {
    var cdf = [];
    for (var i = 0; i < histogramValues.length; i++) {
        cdf.push((cdf[i - 1] || 0) + histogramValues[i]);
    }
    return cdf;
}

/**
 * Calculate pixel values from CDF values
 */
function calcValuesFromCDF(cdf) {
    var values = [],
        minCDF = getMinCDF(cdf),
        diffCDF = cdf[cdf.length - 1] - minCDF;
    for (var i = 0; i < cdf.length; i++) {
        values[i] = Math.round((cdf[i] - minCDF) / diffCDF * 255);
    }
    return values;
}

/**
 * Get min CDF value
 */
function getMinCDF(cdf) {
    var i = 0;
    while (cdf[i] !== undefined && cdf[i] === 0) {
        i++;
    }
    return cdf[i] || 0;
}

/**
 * Draw histogram
 */
function plotHistogram($container, values, options) {
    var series = [];

    for (var i = 0; i < values.length; i++) {
        series.push([i, values[i]]);
    }

    $.plot($container, [series], options);
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

/**
 * Generate matrix with normally distributed random values
 */
function normalRandomMatrix(mean, variance, width, height) {
    var x, y,
        result = [];
    for (y = 0; y < height; y++) {
        result[y] = [];
        for (x = 0; x < width; x++) {
            result[y][x] = normalRandom(mean, variance);
        }
    }
    return result;
}

/**
 * Generate random value with normal distribution
 */
function normalRandom(mean, variance) {
    if (mean == undefined)
        mean = 0.0;
    if (variance == undefined)
        variance = 1.0;
    var V1, V2, S;
    do {
        var U1 = Math.random();
        var U2 = Math.random();
        V1 = 2 * U1 - 1;
        V2 = 2 * U2 - 1;
        S = V1 * V1 + V2 * V2;
    } while (S > 1);

    X = Math.sqrt(-2 * Math.log(S) / S) * V1;
//  Y = Math.sqrt(-2 * Math.log(S) / S) * V2;
    X = mean + Math.sqrt(variance) * X;
//  Y = mean + Math.sqrt(variance) * Y ;
    return X;
}