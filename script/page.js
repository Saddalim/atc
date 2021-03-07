
var incommTimer = null;

function hideIncomm(str) {
    incommTimer = null;
    $('#incomm').html('');
}

/**
 * Make text TTS-friendly
 * @param text
 */
function ttsize(text) {

    var retval = text;

    // Put in company names
    for (var i = 0; i < Companies.length; ++i) {
        retval = retval.replace(Companies[i], CompanyNames[i] + ' ');
    }
    // Lowercase waypoint names so TTS will not spell them
    for (i = 0; i < waypoints.length; ++i) {
        retval = retval.replace(waypoints[i].name, waypoints[i].name.toLowerCase());
    }
    // Separate numbers so they are pronounced digit by digit
    for (i = 0; i <= 9; ++i) {
        retval = retval.replace(i, i + ' ');
    }

    // Some more TTS fixes
    retval = retval.replace('000', ' thousand ')
        .replace('00', ' hundred ')
        .replace('0', ' zero ')
        .replace('FL', ' flight level ');

    return retval;
}

/**
 * Make runway name TTS-friendly
 * @param runway
 */
function ttsizeRunway(runway) {
    if (isNaN(runway)) {
        return runway.replace('L', ' left').replace('R', ' right');
    } else {
        return runway;
    }
}

function showIncomm(str) {

    $('#incomm').html(str);
    if (incommTimer != null) {
        clearTimeout(incommTimer);
    }
    incommTimer = setTimeout(hideIncomm, commPersistence);


}

$(function() {
    var map = $('#map');
    var drag = false;
    var lastX = null;
    var lastY = null;

    $('#commandInput').focus();

    map.mousewheel(function(e) {
        var delta = e.deltaY * zoomMultiplier;
        canvasWidthKm = Math.max(canvasWidthKm - e.deltaY * zoomMultiplier, maxZoomWidth);
        })
        .mousedown(function(e) {
            if (e.which == 1) {
                drag = true;
                lastX = e.pageX;
                lastY = e.pageY;
            }
        })
        .mouseup(function(e) {
            if (e.which == 1) {
                drag = false;
                $('#commandInput').focus();
            }
        })
        .mousemove(function(e) {
            if (drag) {
                canvasCenterX += (e.pageX - lastX) * canvasWidthKm * dragMultiplier;
                canvasCenterY += (e.pageY - lastY) * canvasWidthKm * dragMultiplier;
                lastX = e.pageX;
                lastY = e.pageY;
            }
        });

});