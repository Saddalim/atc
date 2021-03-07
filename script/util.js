/**
 * Converts radians to degrees
 * @param angle
 * @returns {number}
 */
function toDeg(angle) {
    return angle * (180 / Math.PI);
}

/**
 * Converts degrees to radians
 * @param angle
 * @returns {number}
 */
function toRad(angle) {
    return angle * (Math.PI / 180);
}

/**
 * Calculates how many pixels of the given canvas does the given meter take
 * @param meters
 */
function mToPix(meters) {
    return meters * (canvasWidthPix / (canvasWidthKm * 1000));
}

/**
 * Formats given altitude in feet for display
 * @param alt
 */
function formatAlt(alt) {
    if (alt < 10000) {
        return Math.round(alt);
    } else {
        return "FL" + Math.round(alt / 100);
    }
}

/**
 * Normalize given angle in degrees to 0..359
 * @param $angle
 * @returns {*}
 */
function normalize(angle) {
    a = angle;
    while (a > 360) a -= 360;
    while (a < 0) a += 360;
    return a;
}

function norm(angle) {
    return normalize(angle);
}

/**
 * CW is positive, CCW is negative, returns degrees
 * @param angle1
 * @param angle2
 */
function signedAngleBetween(angle1, angle2) {
    var diff = angle2 - angle1;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
}

/**
 * Returns normalized angle of line between two points given in degrees [degree]
 * @param x1
 * @param y1
 * @param x2
 * @param y2
 */
function getAngleBetween(x1, y1, x2, y2) {

    var angle = Math.atan2(y2 - y1, x2 - x1);

    if (angle < 0) {
        angle += Math.PI * 2;
    }

    // Atan2 gives angle relative to +X, we need relative to +Y
    angle += Math.PI / 2;

    return norm(toDeg(angle));
}

/**
 * Returns N, S, E, W, etc according to angle given in degrees
 * @param angle
 */
function angleToCardinal(angle) {
    if (angle >= 337.5 || angle < 22.5) return "N";
    if (angle >= 22.5 && angle < 67.5) return "NE";
    if (angle >= 67.5 && angle < 112.5) return "E";
    if (angle >= 112.5 && angle < 157.5) return "SE";
    if (angle >= 157.5 && angle < 202.5) return "S";
    if (angle >= 202.5 && angle < 247.5) return "SW";
    if (angle >= 247.5 && angle < 292.5) return "W";
    return "NW";
}

/**
 * Returns human-readable cardinal (for TTS)
 * @param cardinal
 */
function formatCardinal(cardinal) {
    switch (cardinal) {
        case "N": return "North";
        case "NE": return "Northeast";
        case "E": return "East";
        case "SE": return "Southeast";
        case "S": return "South";
        case "SW": return "Southwest";
        case "W": return "West";
        case "NW": return "Northwest";
        default: return "Unknown";
    }
}

function getIlsSegmentPoint(rwyNearEndX, rwyNearEndY, rwyAngle, segment) {
    var signX = ((rwyAngle >= 0) && (rwyAngle < 180)) ? -1 : 1;
    var signY = ((rwyAngle >= 90) && (rwyAngle < 270)) ? -1 : 1;
    /*console.log("NearEndY: " + rwyNearEndY +
        ", angle: " + rwyAngle +
        ", toRad: " + toRad(rwyAngle) +
        ", toCos: " + Math.cos(toRad(rwyAngle)) +
        ", seg: " + segment +
        ", ANS: " + rwyNearEndY + Math.cos(toRad(rwyAngle)) * segment * ilsSegmentLength * signY);
    return {
        x: rwyNearEndX + Math.sin(toRad(rwyAngle)) * segment * ilsSegmentLength * signX,
        y: rwyNearEndY + Math.cos(toRad(rwyAngle)) * segment * ilsSegmentLength * signY
    };*/

    var alpha = 90 - Math.abs((rwyAngle % 180) - 90);
    return {
        x: rwyNearEndX + Math.sin(toRad(alpha)) * segment * ilsSegmentLength * signX,
        y: rwyNearEndY + Math.cos(toRad(alpha)) * segment * ilsSegmentLength * signY
    }
}

/**
 * Calculates given point's +/- distance from the line given with 2 points [m]
 * @param pX
 * @param pY
 * @param l1X
 * @param l1Y
 * @param l2X
 * @param l2Y
 */
function distOfPointFromLine(pX, pY, l1X, l1Y, l2X, l2Y) {
    return ((l2Y - l1Y) * pX - (l2X - l1X) * pY + l2X*l1Y + l2Y * l1X)
        / Math.sqrt(Math.pow(l2Y - l1Y, 2) + Math.pow(l2X - l1X, 2));
}

function getDistanceBetween(x1, y1, x2, y2)
{
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function get3DDistanceBetween(x1, y1, z1, x2, y2, z2)
{
    return Math.sqrt(Math.pow(getDistanceBetween(x1, y1, x2, y2), 2) + Math.pow(z1 - z2, 2));
}

function get3DDistanceBetweenAircraft(aircraft1, aircraft2)
{
    return get3DDistanceBetween(aircraft1.x, aircraft1.y, aircraft1.altitude, aircraft2.x, aircraft2.y, aircraft2.altitude);
}