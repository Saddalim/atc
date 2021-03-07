
// Game dynamics
var PlaneStatus = {
    INVALID: 0,
    FINISHED: 1,

    GROUND_BGN: 10,
        PARKING: 11,
        LANDING: 12,
        WAITING: 13,
        TAKEOFF: 14,
        TAXIING: 15,
    GROUND_END: 19,

    FLY_BGN: 20,
        FLYWYPT: 21,
        FLYDIR:  22,
        FLYHOLD: 23,
        LININGUP: 24,
        TAKINGOFF: 25,
        GLIDE_INTERSECT: 26,
        GLIDE_VISUAL: 27,
        GLIDE_ILS: 28,
        LEAVING: 29,
    FLY_END: 39,

    CRASH_BGN: 50,
        CRASHLAND: 51,
        COLLISION: 52,
    CRASH_END: 59
};

var PlaneGoal = {
    INVALID: 0,

    ARRIVING: 1,
    DEPARTING: 2,
    PASSING: 3
};

var Frequency = {
    TOWER: 0,
    GROUND: 1,
    DEPARTURE: 2,
    CLEARANCE: 3
};

var TaxiTarget = {
    INVALID: 0,

    RUNWAY: 1,
    GATE: 2,
    PARKING: 3
};

function readableState(status) {
    switch (status) {
        case PlaneStatus.INVALID: return "INVALID";
        case PlaneStatus.FINISHED: return "FINISHED";

        case PlaneStatus.GROUND_BGN: return "GROUND_BGN";
            case PlaneStatus.PARKING: return "PARKING";
            case PlaneStatus.LANDING: return "LANDING";
            case PlaneStatus.WAITING: return "WAITING";
            case PlaneStatus.TAKEOFF: return "TAKEOFF";
            case PlaneStatus.TAXIING: return "TAXIING";
        case PlaneStatus.GROUND_END: return "GROUND_END";

        case PlaneStatus.FLY_BGN: return "FLY_BGN";
            case PlaneStatus.FLYWYPT: return "FLYWYPT";
            case PlaneStatus.FLYDIR:  return "FLYDIR";
            case PlaneStatus.FLYHOLD: return "FLYHOLD";
            case PlaneStatus.LININGUP: return "LINING UP";
            case PlaneStatus.TAKINGOFF: return "TAKINGOFF";
            case PlaneStatus.GLIDE_INTERSECT: return "ILS ITRSCT";
            case PlaneStatus.GLIDE_VISUAL: return "APP VISUAL";
            case PlaneStatus.GLIDE_ILS: return "ILS ESTBLSHD";
            case PlaneStatus.LEAVING: return "LEAVING AIRSPC";
        case PlaneStatus.FLY_END: return "FLY_END";

        case PlaneStatus.CRASH_BGN: return "CRASH_BGN";
            case PlaneStatus.CRASHLAND: return "CRASHLAND";
            case PlaneStatus.COLLISION: return "COLLISION";
        case PlaneStatus.CRASH_END: return "CRASH_END";

        default: return "UNKNOWN";
    }
}

function goalName(planeGoal) {
    switch (planeGoal) {
        case PlaneGoal.ARRIVING: return "arriving";
        case PlaneGoal.DEPARTING: return "departing";
        case PlaneGoal.PASSING: return "passing";
        default: return "unknown";
    }
}

function isFlying(state) {
    return state > PlaneStatus.FLY_BGN && state < PlaneStatus.FLY_END;
}

function isCrashed(state) {
    return state > PlaneStatus.CRASH_BGN && state < PlaneStatus.CRASH_END;
}

function isOnGround(state) {
    return state > PlaneStatus.GROUND_BGN && state < PlaneStatus.GROUND_END;
}

var PlaneTypes = ["B737", "A320"];

const Companies = ["MAH", "BAW", "AFL", "AFR", "UAE", "DLH", "WZZ", "RYR"];
const CompanyNames = ["Maleev", "British", "Aeroflot", "AirFrance", "Emirates", "Lufthansa", "WizzAir", "RyanAir"];

function getRandomCallsign() {
    return Companies[(Math.round(Math.random() * (Companies.length - 1)))].toString()
        + (Math.round(Math.random() * 900 + 100).toString());
}

var Attr = {
    INVALID: 0,
    MIN_SPD: 1,    // knots
    MAX_SPD: 2,    // knots
    TURN_RATE: 3,  // degrees per second
    SINK_RATE: 4,  // feet per minute
    CLIMB_RATE: 5, // feet per minute
    ACCEL_RATE: 6, // knots per minute
    TYPE: 7,       // type name
    HEAVY: 8,      // boolean
    GLIDE_LEN: 9,  // length of minimum glideslope [m]
    BRAKE_STR: 10, // brake strength [kn/m/m]
    TAKEOFF_ACCEL: 11 // acceleration during takeoff [kn/m/m]
};

function getAttr(type, attr) {
    switch (type) {
        case "B737":
            switch (attr) {
                case Attr.MIN_SPD: return 180;
                case Attr.MAX_SPD: return 300;
                case Attr.TURN_RATE: return 5;
                case Attr.CLIMB_RATE: return 1800;
                case Attr.ACCEL_RATE: return 100;
                case Attr.HEAVY: return false;
                case Attr.GLIDE_LEN: return 15000;
                case Attr.BRAKE_STR: return 250;
                case Attr.TAKEOFF_ACCEL: return 230;
            }
            break;
        case "A320":
            switch (attr) {
                case Attr.MIN_SPD: return 180;
                case Attr.MAX_SPD: return 300;
                case Attr.TURN_RATE: return 5;
                case Attr.CLIMB_RATE: return 1800;
                case Attr.ACCEL_RATE: return 100;
                case Attr.HEAVY: return false;
                case Attr.GLIDE_LEN: return 15000;
                case Attr.BRAKE_STR: return 250;
                case Attr.TAKEOFF_ACCEL: return 230;
            }
            break;
    }
}

function getAirportParams(name) {
    switch (name) {
        case "LHBP":
            return {
                runways: ["13L/31R", "13R/31L"],
                rwyangle: [130, 130],
                rwylength: [3707, 3010],
                rwyoffsetX: [1750, -2050],
                rwyoffsetY: [358, -442]
            };
            break;
    }
}

const spawnMargin = 50; // Closest possible spawnpoint [km]
const leaveMargin = 30; // Distance from airport where departing planes ask for freq change [km]
const deleteMargin = 60; // Margin off map center where planes are deleted [km]

const minArrivalAlt = 7000; // Minimum altitude of arrivals [ft]
const maxArrivalAlt = 9000; // Maximum altitude of arrivals [ft]

const firstArrival = 1 * 1000; // Initial time to first arrival [ms]
const arrivalInterval = 90 * 1000; // Mean time between arrivals [ms]
const firstDeparture = 20 * 1000; // Initial time to first departure [ms]
const departureInterval = 90 * 1000; // Mean time between departures [ms]

const expediteMultiplier = 2.0; // Multiply ascent/descent rate when expediting

const waypointHitRadius = 100; // Distance from a waypoint when it is considered to be hit [m]
const takeoffStartRadius = 10; // Distance from runway near end when taking off [m]

const ILSdistance = 22 * 1000; // Max distance of where ILS lock can be achieved [m]
const ILSangle = 20; // Max angle diff between runway and aircraft course of where ILS can lock [degrees]

const tickLength = 16; // Length of a simulation tick [ms]
const refreshInterval = 16; // Refresh GUI interval [ms]

// Graphics
const commPersistence = 6000; // Length to show an incoming message [ms]

var canvasWidthPix = 800; // Only initial value, is dynamic [px]
var canvasHeightPix = 500; // Only initial value, is dynamic [px]

var canvasWidthKm = 150; // Only initial value, is dynamic [km]
const canvasHeightKm = canvasHeightPix * (canvasWidthKm / canvasWidthPix); // Only initial value, is dynamic [km]

const speedTrailMultiplier = 0.082; // Ratio of speed and trail length

const zoomMultiplier = 16.0; // Speed of mouse wheel zoom
const maxZoomWidth = 10; // Width of canvas on max zoom [km]

const dragMultiplier = 0.7; // Percent of canvas width in px drag that 1 px of mouse movement causes [%]

const runwayWidth = 5; // Runway line stroke [px]
const airportCircleCount = 6; // Number of proximity circles around a tower
const airportCircleDistance = 16093; // Distance of proximity circles around a tower [m]
const runwayCenterlineLength = 30 * 1000; // Length of runway centerline helper lines [m]
