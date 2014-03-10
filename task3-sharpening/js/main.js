$(window).load(function () {
    var canvas = $('#source')[0],
        outputCanvas = $('#output')[0],
        outputCanvas2 = $('#output2')[0],
        context = canvas.getContext('2d'),
        $sourceImage = $('#source-image'),
        i;

    var $filterSize = $('select[name="filter-size"]'),
        $noise = $('select[name="noise"]'),
        medianFilterSize = 3,
        noiseAmount = 0;

    for (i = 3; i <= 15; i += 2) {
        $filterSize.append('<option value="' + i + '">' + i + 'x' + i + '</option>');
    }

    $noise.append('<option value="0">No noise</option>');
    $noise.append('<option value="0.05">5%</option>');

    for (i = 0.1; i <= 1; i += 0.1) {
        $noise.append('<option value="' + i + '">' + Math.round(i * 100) + '%</option>');
    }

    $sourceImage.one('load', function() {
        canvas.width = $sourceImage.width();
        canvas.height = $sourceImage.height();
        context.drawImage($sourceImage[0], 0, 0);

        //Laplacian sharpening
        laplacianFilter(canvas, outputCanvas, outputCanvas2);
        $('#output-image1-1')[0].src = outputCanvas.toDataURL();
        $('#output-image1-2')[0].src = outputCanvas2.toDataURL();

        //Median filter
        function refreshMedianFilter() {
            noiseSaltPepper(canvas, outputCanvas2, noiseAmount);
            $('#output-image2-2')[0].src = outputCanvas2.toDataURL();
            medianFilter(outputCanvas2, outputCanvas, medianFilterSize);
            $('#output-image2-1')[0].src = outputCanvas.toDataURL();
        }

        $noise.on('change', function () {
            noiseAmount = parseFloat($noise.val());
            refreshMedianFilter();
        });

        $filterSize.on('change', function () {
            medianFilterSize = parseInt($filterSize.val(), 10);
            refreshMedianFilter();
        });

        refreshMedianFilter();

    }).each(function() {
        if(this.complete) $(this).load();
    });
});

/**
 * Apply median filter on the image
 */
function medianFilter(sourceCanvas, resultCanvas, size) {
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;

    size = size || 3;

    var matrixData = getImageMatrix(sourceCanvas);

    var filteredMatrix = medianFilterMatrix(matrixData, size);

    drawImageFromMatrix(filteredMatrix, resultCanvas);
}

/**
 * Apply median filter on the matrix
 */
function medianFilterMatrix(matrix, size) {
    var x, y,
        kernelX, kernelY,
        matrixX, matrixY,
        center = Math.floor(size / 2),
        pixelValues,
        result = [];

    for (y = 0; y < matrix.length; y++) {
        result[y] = [];
        for (x = 0; x < matrix[0].length; x++) {
            pixelValues = [];
            for (kernelY = 0; kernelY < size; kernelY++) {
                for (kernelX = 0; kernelX < size; kernelX++) {
                    matrixX = x - center + kernelX;
                    matrixY = y - center + kernelY;
                    if (matrix[matrixY] !== undefined && matrix[matrixY][matrixX] !== undefined) {
                        pixelValues.push(matrix[matrixY][matrixX]);
                    }
                }
            }
            result[y][x] = Math.round(medianFromVector(pixelValues));
        }
    }
    return result;
}

/**
 * Calculate median from array of numbers
 */
function medianFromVector(vector) {
    vector = vector.sort();
    var index = Math.floor(vector.length / 2);
    if (vector.length % 2) {
        return vector[index];
    } else {
        return (vector[index] + vector[index - 1]) / 2;
    }
}

/**
 * Add salt and pepper noise to the image
 */
function noiseSaltPepper(sourceCanvas, resultCanvas, amount, whiteAmount) {
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;

    amount = amount || 0;
    whiteAmount = whiteAmount || 0;

    var matrixData = getImageMatrix(sourceCanvas);

    var width = matrixData[0].length,
        height = matrixData.length,
        i, x, y,
        newValue;

    if (amount) {
        for (i = 0; i < width * height; i++) {
            var addNoise = Math.random() < amount;

            if (addNoise) {
                newValue = Math.random() < whiteAmount ? 0 : 255;
                newValue = 0;
                x = i % width;
                y = Math.floor(i / width);
                matrixData[y][x] = newValue;
            }
        }
    }

    drawImageFromMatrix(matrixData, resultCanvas);
}

/**
 * Apply Laplacian sharpening on the image
 */
function laplacianFilter(sourceCanvas, resultCanvas, edgeCanvas) {
    resultCanvas.width = sourceCanvas.width;
    resultCanvas.height = sourceCanvas.height;
    edgeCanvas.width = sourceCanvas.width;
    edgeCanvas.height = sourceCanvas.height;

    var kernel = [[0, 1, 0], [1, -4, 1], [0, 1, 0]];
    //var kernel = [[1, 1, 1], [1, -8, 1], [1, 1, 1]];

    var matrixData = getImageMatrix(sourceCanvas);

    var convolvedMatrix = convolve(matrixData, kernel);

    var summedMatrix = numeric.subeq(matrixData ,convolvedMatrix);

    drawImageFromMatrix(convolvedMatrix, edgeCanvas);

    drawImageFromMatrix(summedMatrix, resultCanvas);
}

/**
 * Rotate matrix by 180 degrees
 */
function rotateMatrix180(matrix) {
    var x, y,
        resultX, resultY,
        result = [];
    for (y = matrix[0].length - 1, resultY = 0; y >= 0; y--, resultY++) {
        result[resultY] = [];
        for (x = matrix.length - 1, resultX = 0; x >= 0; x--, resultX++) {
            result[resultY][resultX] = matrix[y][x];
        }
    }
    return result;
}

/**
 * Compute the convolution of matrix and kernel
 */
function convolve(matrix, kernel) {
    var rotatedKernel = rotateMatrix180(kernel);

    var x, y,
        kernelX, kernelY,
        matrixX, matrixY,
        kernelCenterX = Math.floor(rotatedKernel[0].length / 2),
        kernelCenterY = Math.floor(rotatedKernel.length / 2),
        newPixelValue,
        result = [];

    for (y = 0; y < matrix.length; y++) {
        result[y] = [];
        for (x = 0; x < matrix[0].length; x++) {
            newPixelValue = 0;
            for (kernelY = 0; kernelY < rotatedKernel.length; kernelY++) {
                for (kernelX = 0; kernelX < rotatedKernel[0].length; kernelX++) {
                    matrixX = x - kernelCenterX + kernelX;
                    matrixY = y - kernelCenterY + kernelY;
                    if (matrix[matrixY] !== undefined && matrix[matrixY][matrixX] !== undefined) {
                        newPixelValue += rotatedKernel[kernelY][kernelX] * matrix[matrixY][matrixX];
                    }
                }
            }
            result[y][x] = newPixelValue;
        }
    }
    return result;
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