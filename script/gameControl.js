
// TODO separate game mechanic control from GUI control in general

var aircraft = [];
var airports = [];
var waypoints = [];
var aircraftTooClose = [];
var activeAirport = null;
var canvasCenterX = 0;
var canvasCenterY = 0;

var muted = false;
var paused = false;
var speedMultiplier = 1.0;

var tickCount = 0;
var elapsedTime = 0; // [ms]

var lastArrival = 0;
var lastDeparture = 0;
var lastCollisionCheck = 0;

const collisionCheckInterval = 200; // Time between collision checks [ms]
const collisionDist = 90; // 3D distance of within flying aircraft are considered crashed [m]
const warningDistInAir = 1000; // 3D distance of within flying aircraft are considered warningly close [m]
const warningDistOnGround = 200; // 2D distance of within aircraft on ground are considered warningly close [m]

var Gui = null;

function moveAnimatons(time) {
    for (var i in aircraft) {
        if (aircraft.hasOwnProperty(i)) {
            if (aircraft[i].move(time) == false) {
                // False means aircraft left map, delete
                $('#coord').html(aircraft[i].callsign + " has left the map.");
                Gui.deregisterAircraft(aircraft[i]);
                aircraft.splice(i, 1);
            }
        }
    }
}

function checkForCollisions()
{
    lastCollisionCheck = elapsedTime;
    var newAircraftTooClose = [];
    for (var x in aircraftTooClose)
    {
        if (aircraft[aircraftTooClose[x][0]].isOnGround() || aircraft[aircraftTooClose[x][1]].isOnGround())
        {
            if (get3DDistanceBetweenAircraft(aircraft[aircraftTooClose[x].plane1], aircraft[aircraftTooClose[x].plane2]) < warningDistOnGround)
            {
                newAircraftTooClose.push(aircraftTooClose[x]);
            }

        }
        else if (get3DDistanceBetweenAircraft(aircraft[aircraftTooClose[x].plane1], aircraft[aircraftTooClose[x].plane2]) < warningDistInAir)
        {
            newAircraftTooClose.push(aircraftTooClose[x]);
        }
    }
    aircraftTooClose = newAircraftTooClose;

    for (var i in aircraft)
    {
        for (var j in aircraft)
        {
            if (i == j) continue;

            if (get3DDistanceBetweenAircraft(aircraft[i], aircraft[j]) < collisionDist)
            {
                aircraft[i].state = PlaneStatus.COLLISION;
                aircraft[j].state = PlaneStatus.COLLISION;
                $('#coord').html(aircraft[i].callsign + " and " + aircraft[j].callsign + " has collided!");
            }

            if (aircraft[i].isOnGround() || aircraft[j].isOnGround())
            {
                if (get3DDistanceBetweenAircraft(aircraft[i], aircraft[j]) < warningDistOnGround && !$.inArray({ plane1: i, plane2: j}, aircraftTooClose))
                {
                    $('#coord').html(aircraft[i].callsign + " and " + aircraft[j].callsign + " are dangerously close!");
                    aircraftTooClose.push({ plane1: i, plane2: j});
                    aircraftTooClose.push({ plane1: j, plane2: i});
                }
            }
            else
            {
                var dist = get3DDistanceBetweenAircraft(aircraft[i], aircraft[j]);
                if (get3DDistanceBetweenAircraft(aircraft[i], aircraft[j]) < warningDistInAir && !$.inArray({ plane1: i, plane2: j}, aircraftTooClose))
                {
                    $('#coord').html(aircraft[i].callsign + " and " + aircraft[j].callsign + " are dangerously close!");
                    aircraftTooClose.push({ plane1: i, plane2: j});
                    aircraftTooClose.push({ plane1: j, plane2: i});
                }
            }
        }
    }
}

function spawnAircraft() {
    if ((lastArrival == 0 && elapsedTime > firstArrival) || elapsedTime - lastArrival > arrivalInterval)
    {
        generateArrival();
        lastArrival = elapsedTime;
    }
    if ((lastDeparture == 0 && elapsedTime > firstDeparture) || elapsedTime - lastDeparture > departureInterval)
    {
        //generateDeparture();
        lastDeparture = elapsedTime;
    }
}

function progressGame() {
    if (! paused)
    {
        moveAnimatons(tickLength * speedMultiplier);
        if (elapsedTime - lastCollisionCheck > collisionCheckInterval) checkForCollisions();
        spawnAircraft();

        elapsedTime = tickCount * tickLength * speedMultiplier;
        tickCount += speedMultiplier;
    }
}

function triggerGuiRefresh() {
    Gui.refresh();
}

function generateArrival() {
    var x, y;
    do {
        x = Math.floor(Math.random() * (deleteMargin * 2) - deleteMargin);
        y = Math.floor(Math.random() * (deleteMargin * 2) - deleteMargin);
    } while (Math.abs(x) < spawnMargin && Math.abs(y) < spawnMargin);

    // All arrivals head (0,0)
    var angle = getAngleBetween(x, y, 0, 0);
    var type = PlaneTypes[Math.round(Math.random() * (PlaneTypes.length - 1))];
    var alt = Math.round((Math.random() * ((maxArrivalAlt - minArrivalAlt) / 1000)) + (minArrivalAlt / 1000)) * 1000;
    var newPlane = new Aircraft(type, x * 1000, y * 1000, alt, PlaneStatus.FLYDIR);
    newPlane.goal = PlaneGoal.ARRIVING;
    newPlane.direction = angle;
    newPlane.targetdir = angle;
    newPlane.callsign = getRandomCallsign();
    aircraft.push(newPlane);
    Gui.registerAircraft(newPlane);

    newPlane.onSpawned();
}

function generateDeparture() {
    var type = PlaneTypes[Math.round(Math.random() * (PlaneTypes.length - 1))];
    var newPlane = new Aircraft(type, 0, 0, 0, PlaneStatus.PARKING);
    newPlane.goal = PlaneGoal.DEPARTING;
    newPlane.callsign = getRandomCallsign();
    newPlane.speed = 0;
    newPlane.targetspeed = 0;
    newPlane.targetdir = norm(Math.round((Math.random() * 360)));
    aircraft.push(newPlane);
    Gui.registerAircraft(newPlane);

    newPlane.onSpawned();
}

function calculateCnts() {

}

var resizeTimeout = null;
$(document).ready(function() {

    Gui = new Radar();

    //adjustCanvasSize();
    Gui.adjustElementsSize();

    // Delay resize redraw to avoid unnecessary computing and flickering
    $(window).resize(function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(Gui.adjustElementsSize, 100);
    });

    activeAirport = new Airport("LHBP", 0, 0);
    airports.push(activeAirport);

    setInterval(progressGame, tickLength);
    setInterval(triggerGuiRefresh, refreshInterval);

    //setTimeout(generateArrival, firstArrival);
    //setInterval(generateArrival, arrivalInterval);

    //setTimeout(generateDeparture, firstDeparture);
    //setInterval(generateDeparture, departureInterval);
});