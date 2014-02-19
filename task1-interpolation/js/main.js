$(window).load(function () {
    var canvas = $('#source')[0],
        resizedCanvas = $('#resize')[0],
        context = canvas.getContext('2d'),
        $sourceImage = $('#source-image'),
        $resizedImage = $('#resized-image');

    $('img').one('load', function() {
        canvas.width = $sourceImage.width();
        canvas.height = $sourceImage.height();
        context.drawImage($sourceImage[0], 0, 0);
        resize(canvas, resizedCanvas, canvas.width * 2, canvas.height * 2);
        $resizedImage[0].src = resizedCanvas.toDataURL();
    }).each(function() {
        if(this.complete) $(this).load();
    });
});

function resize (sourceCanvas, resultCanvas, width, height) {
    width = Math.round(width);
    height = Math.round(height);
    resultCanvas.width = width;
    resultCanvas.height = height;
    console.log(resultCanvas.width, resultCanvas.height);
    var sourceContext = sourceCanvas.getContext('2d'),
        resultContext = resultCanvas.getContext('2d'),
        sourceData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height),
        result = resultContext.createImageData(width, height),
        xScale = sourceCanvas.width / width,
        yScale = sourceCanvas.height / height,
        x, y, newPixel, pixelCoord;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            newPixel = bilinearSample(sourceData.data, x * xScale, y * yScale, 0, sourceCanvas.width);
            pixelCoord = 4 * (y * width + x);
            result.data[pixelCoord] = newPixel;
            result.data[pixelCoord + 1] = newPixel;
            result.data[pixelCoord + 2] = newPixel;
            result.data[pixelCoord + 3] = 255;
        }
    }

    resultContext.putImageData(result, 0, 0);
}

function bilinearSample(pixels, x, y, offset, width) {
    var percentX = x - Math.floor(x),
        percentY = y - Math.floor(y),
        coordQ11 = offset + Math.floor(y) * width * 4 + Math.floor(x) * 4,
        coordQ12 = offset + Math.ceil(y) * width * 4 + Math.floor(x) * 4,
        coordQ21 = offset + Math.floor(y) * width * 4 + Math.ceil(x) * 4,
        coordQ22 = offset + Math.ceil(y) * width * 4 + Math.ceil(x) * 4;

    var R1 = pixels[coordQ21] * percentX + pixels[coordQ11] * (1.0 - percentX);
    var R2 = pixels[coordQ22] * percentX + pixels[coordQ12] * (1.0 - percentX);

    return R2 * percentY + R1 * (1.0 - percentY);
}
