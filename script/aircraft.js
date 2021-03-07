
// AI constants
const ilsSegmentLength = 2 * 1000; // Distance between ILS guide points before runway [m]
const landingSpeedMargin = 80; // How much faster do we land than minimum [kn]
const approachSpeed = 350; // Mean approach speed for ILS intercept [kn]
const taxiSpeed = 22; // Speed while taxiing [kn]
const takeoffDistanceMargin = 500; // Target meters of runway left when taking off [m]
const takeoffSpeedMarginMultiplier = 1.1; // How much faster a plane should go than its minimum speed when taking off
const takeoffAltitude = 5000; // Altitude to reach after taking off [ft]
const requestRepeatTimeout = 30 * 1000; // Time to wait for instructions after requests if unanswered [ms]

var ID = 1;
var voices = ["UK English Male", "UK English Female"];

var Aircraft = Fiber.extend(function() {
    return {
        init: function(type, x, y, alt, state) {
            // TODO get all or none params to constructor
            this.id = ID++;
            this.x = x;
            this.y = y;
            this.altitude = alt;
            this.type = type;
            this.speed = 400; // TODO
            this.targetVs = null;
            this.targetspeed = this.speed;
            this.direction = 0;
            this.callsign = "";
            this.targetdir = this.direction;
            this.targetalt = this.altitude;
            this.expediting = false;
            this.ils = null;
            this.waypoint = "";
            this.goal = PlaneGoal.INVALID;

            this.lastDistance = null;
            this.requestPersistence = null; // Timer for repeating requests if no command got from tower

            this.isOverRunway = false;

            this.state = state;

            this.voice = voices[Math.round(Math.random() * (voices.length - 1))];

            this.hasTakeoffClearance = false;
        },

        onSpawned: function() {
            if (this.goal == PlaneGoal.ARRIVING)
            {
                // Measure in meters, say in miles: /1609
                var distance = Math.round(Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)) / 1609);
                this.say("With you, " + distance + " miles " + formatCardinal(angleToCardinal(norm(this.direction - 180))));
            }
            else if (this.goal == PlaneGoal.DEPARTING)
            {
                this.say("Ready for taxi, " + formatCardinal(angleToCardinal(norm(this.targetdir - 180))) + " departure.");
            }
        },

        isFlying: function() {
            return isFlying(this.state);
        },

        isOnGround: function() {
            return isOnGround(this.state);
        },

        say: function(text) {
            var toSay = this.callsign + ": " + text;
            showIncomm(toSay);

            if (! muted)
            {
                responsiveVoice.speak(ttsize(toSay), this.voice);
            }
        },

        sayPersistent: function(text) {
            if (this.requestPersistence == null)
            {
                this.say(text);
                this.requestPersistence = requestRepeatTimeout;
            }
        },

        move: function(delta) {

            // Check if goal is finished, and if yes, delete ourselves
            // TODO scoring
            if (this.state == PlaneStatus.FINISHED) {
                return false;
            }

            // Reduce request persistence timer if necessary (if we have unanswered requests)
            if (this.requestPersistence != null) {
                this.requestPersistence -= delta;

                if (this.requestPersistence <= 0) {
                    this.requestPersistence = null;
                }
            }

            switch (this.state) {
                // ===============================================================================
                case PlaneStatus.FLYDIR:

                    // Do nothing, follow target direction/alt/speed

                    break;

                // ===============================================================================
                case PlaneStatus.FLYWYPT:

                    // Check if hit, and if not, re-calculate angle (P-regulator)
                    var distanceFromWp = getDistanceBetween(this.x, this.y, this.waypoint.x, this.waypoint.y);
                    if (distanceFromWp < waypointHitRadius) {
                        this.waypoint = null;
                        this.state = PlaneStatus.FLYDIR;
                    } else {
                        this.target(this.waypoint.x, this.waypoint.y);
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.GLIDE_INTERSECT:

                    // Try to catch ILS glideslope, otherwise follow target

                    if (this.ils == null) {
                        console.error(this.callsign + " is in ILS intersect, but no ILS data given.");
                        break;
                    }

                    var distance = Math.sqrt(Math.pow(this.x - this.ils.rwyNearendX, 2) + Math.pow(this.y - this.ils.rwyNearendY, 2));

                    // Declare missed approach if distance from the runway is increasing
                    if (this.lastDistance != null && this.lastDistance < distance) {
                        this.state = PlaneStatus.FLYDIR;
                        this.targetalt = 3000; // TODO constant
                        this.targetspeed = 200; // TODO constant
                        this.targetVs = null;
                        this.say("Executing missed approach.");
                    }

                    this.targetspeed = approachSpeed;
                    this.targetalt = 3000; // TODO

                    // Aim for farthest ILS segment waypoint (see method explained in GLIDE_ILS)
                    var target = getIlsSegmentPoint(this.ils.rwyNearendX, this.ils.rwyNearendY, this.ils.angle, Math.floor(getAttr(this.type, Attr.GLIDE_LEN) / ilsSegmentLength));

                    // For debug purposes
                    this.waypoint = {
                        name: "ILS SEG " + segment,
                        x: target.x,
                        y: target.y
                    };

                    this.target(target.x, target.y);

                    // Filter by distance first to avoid costly angle calculations whenever possible
                    if (distance > ILSdistance) {
                        break;
                    }

                    var angleToRywEnd = getAngleBetween(this.x, this.y, this.ils.rwyNearendX, this.ils.rwyNearendY);

                    var inCone = angleToRywEnd > norm(this.ils.angle - (ILSangle / 2))
                                && angleToRywEnd < norm(this.ils.angle + (ILSangle / 2));


                    if ( !inCone ) {
                        break;
                    }

                    // ILS caught!
                    this.state = PlaneStatus.GLIDE_ILS;

                    this.say("On final, runway " + this.ils.runway);

                    break;

                // ===============================================================================
                case PlaneStatus.GLIDE_ILS:

                    if (this.ils == null) {
                        console.error(this.callsign + " is in ILS glide, but no ILS data given.");
                        break;
                    }

                    // TODO Primitive approach:
                    // Virtual waypoints are set on centerline, these separate the glideslope into segments
                    // In each segment, target the next virtual waypoint. Heading will converge to runway angle.
                    // Once near runway end is reached, target far end. Once ground touched, switch to LANDING.

                    // Once we're over the runway on final, fly stable till touchdown
                    if (!this.isOverRunway) {
                        var distance = Math.sqrt(Math.pow(this.x - this.ils.rwyNearendX, 2) + Math.pow(this.y - this.ils.rwyNearendY, 2));
                        var segment = Math.floor(Math.min(distance, getAttr(this.type, Attr.GLIDE_LEN)) / ilsSegmentLength);
                        var target;
                        if (segment == 0 && distance < 100) {
                            target = {x: this.ils.rwyFarendX, y: this.ils.rwyFarendY};
                            this.isOverRunway = true;
                        } else {
                            target = getIlsSegmentPoint(this.ils.rwyNearendX, this.ils.rwyNearendY, this.ils.angle, segment);
                        }

                        // For debug purposes
                        this.waypoint = {
                            name: "ILS SEG " + segment,
                            x: target.x,
                            y: target.y
                        };

                        this.target(target.x, target.y);

                        var Vland = getAttr(this.type, Attr.MIN_SPD) + landingSpeedMargin; // Landing speed
                        // Speed in knots, needed in m/s to get time until land in seconds
                        // Calculate with Vland as doing so with current speed will make us run short.
                        // Vland overshoots a bit, but that's the goal anyways.
                        // And a little extra to distance to avoid hitting the exact beginning of the runway
                        var timeToLand = (distance * 1.3) / (Vland * (1.852 / 3.6));
                        // Altitude in feet, time in seconds, V/S in feet per minute (bah... :) )
                        this.targetVs = -(this.altitude/* * 3.2808399*/) / (timeToLand / 60);
                        this.targetalt = null;

                        // old approach
                        //this.targetspeed = getAttr(this.type, Attr.MIN_SPD) + (200 - getAttr(this.type, Attr.MIN_SPD)) * (distance / ILSdistance);
                        this.targetspeed = Vland + (Math.min(distance, ILSdistance) / ILSdistance) * (approachSpeed - Vland);
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.LANDING:

                    this.targetspeed = taxiSpeed;
                    this.target(this.ils.rwyFarendX, this. ils.rwyFarendY);

                    if (this.speed <= taxiSpeed) {
                        this.state = PlaneStatus.TAXIING;
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.WAITING:

                    this.targetspeed = 0.0;

                    break;

                // ===============================================================================
                case PlaneStatus.TAXIING:

                    this.targetspeed = taxiSpeed;

                    switch (this.goal) {
                        case PlaneGoal.ARRIVING:
                            this.target(this.ils.airportX, this.ils.airportY);
                            this.sayPersistent("Vacating runway, request frequency change.");
                            break;
                        case PlaneGoal.DEPARTING:
                            if (this.targetRunway != null)
                            {
                                this.target(this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY);
                                var distanceFromRwy = getDistanceBetween(this.x, this.y, this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY);

                                if (distanceFromRwy < waypointHitRadius)
                                {
                                    this.state = PlaneStatus.WAITING;
                                    this.targetspeed = 0;

                                    this.sayPersistent("Ready for takeoff, " + this.targetRunway.runway);
                                }
                            }
                            break;
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.LININGUP:

                    this.target(this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY);
                    this.targetspeed = taxiSpeed / 3.0;

                    if (getDistanceBetween(this.x, this.y, this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY) < takeoffStartRadius)
                    {
                        this.target(this.targetRunway.rwyFarendX, this.targetRunway.rwyFarendY);
                        this.targetspeed = taxiSpeed / 20.0;

                        var angleToRwyFarEnd = getAngleBetween(this.x, this.y, this.targetRunway.rwyFarendX, this.targetRunway.rwyFarendY);
                        if (Math.abs(signedAngleBetween(this.direction, angleToRwyFarEnd)) != 0.0)
                        {

                            this.target(this.targetRunway.rwyFarendX, this.targetRunway.rwyFarendY);
                        }
                        else
                        {
                            if (this.hasTakeoffClearance)
                            {
                                this.say("Taking off runway " + ttsizeRunway(this.targetRunway.runway));
                                this.state = PlaneStatus.TAKINGOFF;
                            }
                            else
                            {
                                this.sayPersistent("Lined up runway " + ttsizeRunway(this.targetRunway.runway));
                                this.state = PlaneStatus.WAITING;
                            }
                        }
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.TAKINGOFF:

                    var takeoffLength = getDistanceBetween(this.x, this.y, this.targetRunway.rwyFarendX, this.targetRunway.rwyFarendY) - takeoffDistanceMargin;
                    var speedTillTakeoff = Math.abs(getAttr(this.type, Attr.MIN_SPD) * takeoffSpeedMarginMultiplier - this.speed);


                    var takeoffSpd = getAttr(this.type, Attr.MIN_SPD) * takeoffSpeedMarginMultiplier;
                    this.targetspeed = takeoffSpd * 1.3;

                    if (this.speed > takeoffSpd)
                    {
                        this.targetalt = takeoffAltitude;
                        this.expediting = true;

                        if (this.altitude > takeoffAltitude / 2)
                        {
                            this.sayPersistent("Requesting turn to the " + formatCardinal(angleToCardinal(norm(this.targetdir - 180))));
                            this.state = PlaneStatus.FLYDIR;
                        }
                    }
                    else
                    {
                        this.target(this.targetRunway.rwyFarendX, this.targetRunway.rwyFarendY);
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.COLLISION:

                    this.targetalt = 0.0;
                    this.targetspeed = 0.0;
                    this.targetdir = this.direction;

                    if (this.altitude <= 0.0)
                    {
                        this.altitude = 0.0;
                        this.state = PlaneStatus.CRASHLAND;
                    }

                    break;

                // ===============================================================================
                case PlaneStatus.CRASHLAND:
                {
                    this.speed = 0.0;
                    this.targetspeed = 0.0;
                    this.altitude = 0.0;
                    this.targetalt = 0.0;
                    this.direction = 0;
                    this.targetdir = 0;

                    setTimeout(this.remove, 10000);
                }
            }

            // ===============================================================================
            // Modify position and orientation based on currents and targets

            // Turn, if needed
            if (this.targetdir != null && this.direction != this.targetdir) {
                var maxTurn = getAttr(this.type, Attr.TURN_RATE) * delta / 1000;
                if (this.isOnGround()) maxTurn *= 2.5; // TODO constant
                var diffAngle = signedAngleBetween(this.direction, this.targetdir);
                if (Math.abs(diffAngle) < maxTurn) {
                    this.direction = +(this.targetdir);
                } else {
                    this.direction = (this.direction + maxTurn * Math.sign(diffAngle)) % 360;
                }
                if (this.direction < 0) {
                    this.direction += 360;
                }
            } else if (this.goal == PlaneGoal.DEPARTING
                && (this.x/1000 < -leaveMargin
                || this.y/1000 < -leaveMargin
                || this.x/1000 > leaveMargin
                || this.y/1000 > leaveMargin)) {

                this.sayPersistent("Leaving your airspace, request frequency change.");

            } else if (this.x/1000 < -deleteMargin
                || this.y/1000 < -deleteMargin
                || this.x/1000 > deleteMargin
                || this.y/1000 > deleteMargin) {

                // Out of map and not turning, delete plane
                // TODO And if it was an arrival, get minus points
                return false;
            }

            // Change altitude, if needed
            if (this.targetVs != null ||
                (this.targetalt != null && this.altitude != this.targetalt)) {
                var climb;

                // Primary setting is target V/S
                var altChange = 0;
                if (this.targetVs != null) {

                    // If target V/S is set

                    climb = Math.sign(this.targetVs);
                    altChange = Math.min(getAttr(this.type, Attr.CLIMB_RATE), Math.abs(this.targetVs))
                        * delta / 60000;
                } else {

                    // No target V/S, head for target altitude
                    climb = this.targetalt > this.altitude ? 1 : -1;

                    // sink/ascent rates in feet per minute. /60000 to get feet per ms
                    altChange = getAttr(this.type, Attr.CLIMB_RATE)
                        * delta / 60000;

                    if (this.expediting) {
                        altChange *= expediteMultiplier;
                    }
                }

                if (this.state == PlaneStatus.COLLISION) altChange = 6000 * delta / 60000;

                if (this.targetalt != null
                    && Math.abs(this.targetalt - this.altitude) < altChange) {

                    this.altitude = +(this.targetalt);
                    this.expediting = false;

                } else {
                    this.altitude += +(altChange * climb);
                }

                if (this.altitude < 0) {
                    this.altitude = 0;
                    this.targetalt = 0;
                    this.targetVs = null;

                    if (this.state == PlaneStatus.GLIDE_ILS) {
                        // Just touched ground
                        this.state = PlaneStatus.LANDING;
                        this.targetspeed = 0;
                        this.targetdir = this.ils.angle;
                    } else {
                        // Just hit ground
                        this.state = PlaneStatus.CRASHLAND;
                        this.targetspeed = null;
                        this.speed = 0;
                    }
                }
            }

            // Change speed, if needed
            if (this.targetspeed != null && this.targetspeed != this.speed) {
                var accelerate = this.targetspeed > this.speed;

                // acceleration in knots per minute. /60000 to get knots per ms
                var accelerationType = Attr.ACCEL_RATE;
                switch (this.state) {
                    case PlaneStatus.LANDING: accelerationType = Attr.BRAKE_STR; break;
                    case PlaneStatus.TAKINGOFF: accelerationType = (this.altitude == 0.0 ? Attr.TAKEOFF_ACCEL : Attr.ACCEL_RATE); break;
                }
                var maxSpeedChange = getAttr(this.type, accelerationType)
                    * delta / 60000;

                if (isOnGround(this.state)) {
                    maxSpeedChange *= 3; // TODO constant
                }

                if (this.state == PlaneStatus.COLLISION) maxSpeedChange *= 5.0;

                if (Math.abs(this.targetspeed - this.speed) < maxSpeedChange) {
                    this.speed = +(this.targetspeed);
                } else {
                    this.speed += +(maxSpeedChange * (accelerate ? 1 : -1));
                }
            }

            // Speed in knots, delta in ms
            // knots -- *1.852 --> km/h
            // km/h  -- /3600  --> m/ms
            this.x += Math.sin(toRad(this.direction)) * this.speed * 1.852 / 3600 * delta;
            this.y -= Math.cos(toRad(this.direction)) * this.speed * 1.852 / 3600 * delta;

            return true;
        },

        turn: function(targetDir) {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            if (targetDir >= 0 && targetDir < 360) {
                this.targetdir = +targetDir;
                this.waypoint = null;
                this.state = PlaneStatus.FLYDIR;
                this.say("Roger, turning to " + targetDir);
            } else {
                this.say("say again direction.");
            }
        },

        changeAltitude: function(targetAlt) {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            if ( !isNaN(targetAlt)) {
                this.targetalt = +targetAlt;
            } else {
                this.targetalt = (+(targetAlt.substr(2))) * 100;
            }
            if (this.targetalt > this.altitude) {
                this.say("Roger, climbing to " + formatAlt(this.targetalt));
            } else {
                this.say("Roger, descending to " + formatAlt(this.targetalt));
            }
        },

        expedite: function() {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            if (this.targetalt == null
                || this.targetalt == this.altitude)
            {
                this.say("Maintaining altitude.");
            } else {
                this.expediting = true;
                if (this.targetalt > this.altitude) {
                    this.say("Roger, expediting climb to " + formatAlt(this.targetalt));
                } else {
                    this.say("Roger, expediting descent to " + formatAlt(this.targetalt));
                }
            }
        },

        changeSpeed: function(targetSpeed) {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            if (targetSpeed < getAttr(this.type, Attr.MIN_SPD)) {
                this.say("That's too slow for this aircraft.");
                return;
            }

            this.targetspeed = targetSpeed;
            this.say("Roger, change speed to " + targetSpeed);
        },

        target: function(x, y) {
            this.targetdir = getAngleBetween(this.x, this.y, x, y);
        },

        targetWP: function(waypoint) {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            if (waypoint != null) {
                this.target(waypoint.x, waypoint.y);
                this.state = PlaneStatus.FLYWYPT;
                this.waypoint = waypoint;
                this.ils = null;
                this.say("Roger, heading " + this.waypoint.name);
            } else {
                this.say("Say again waypoint.");
            }
        },

        landILS: function(airport, runway) {
            if (!this.isFlying()) {
                this.say("Say again");
                return;
            }

            var details = airport.getRunwayDetails(runway);

            if (details == false) {
                this.say("Say again runway.");
                return;
            }

            this.ils = details;
            this.state = PlaneStatus.GLIDE_INTERSECT;

            this.waypoint = null;

            this.say("Roger, cleared to land, runway " + ttsizeRunway(runway));
        },

        remove: function() {
            this.state = PlaneStatus.FINISHED;
        },

        changeFreq: function(freq) {
            switch (freq)
            {
                case Frequency.GROUND:
                    if (this.goal == PlaneGoal.ARRIVING && this.state == PlaneStatus.TAXIING) {
                        this.say("Roger, switching to ground. Goodbye.");
                        setTimeout(this.remove, 2000);
                        this.state = PlaneStatus.FINISHED;
                    }
                    else
                    {
                        this.say("Unable to switch to ground now.");
                    }
                    break;
                case Frequency.DEPARTURE:
                    if (this.goal == PlaneGoal.DEPARTING && this.state == PlaneStatus.LEAVING) {
                        this.say("Roger, frequency change approved. Goodbye.");
                        setTimeout(this.remove, 2000);
                    }
                    else
                    {
                        this.say("Unable to switch to departure now.");
                    }
                    break;
                default:
                    this.say("Say again frequency.");
            }
        },

        taxiTo: function(targetType, airport, runway) {
            if (this.isOnGround() && this.goal == PlaneGoal.DEPARTING)
            {
                var details = airport.getRunwayDetails(runway);

                if (details == false) {
                    this.say("Say again runway.");
                    return;
                }

                this.state = PlaneStatus.TAXIING;
                this.targetRunway = details;
                this.target(details.rwyNearendX, details.rwyNearendY);
                this.say("Taxiing to runway " + ttsizeRunway(runway));
            }
            else
            {
                this.say("Unable to comply.");
            }
        },

        lineup: function(airport, runway) {
            if (this.isOnGround() && this.goal == PlaneGoal.DEPARTING)
            {
                if (this.targetRunway == null) this.targetRunway = airport.getRunwayDetails(runway);

                if (getDistanceBetween(this.x, this.y, this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY) < waypointHitRadius)
                {
                    this.state = PlaneStatus.LININGUP;
                    this.hasTakeoffClearance = false;
                    this.say("Lining up runway " + ttsizeRunway(runway));
                }
                else
                {
                    this.say("Unable to comply, I'm not at runway.");
                }
            }
        },

        takeoff: function(airport, runway) {
            if (this.isOnGround() && this.goal == PlaneGoal.DEPARTING)
            {
                if (this.targetRunway == null)
                {
                    this.targetRunway = airport.getRunwayDetails(runway);
                }
                else if (this.targetRunway.runway != runway)
                {
                    this.say("Unable to comply. I'm not at that runway.");
                    return;
                }

                if (getDistanceBetween(this.x, this.y, this.targetRunway.rwyNearendX, this.targetRunway.rwyNearendY) < waypointHitRadius)
                {
                    this.state = PlaneStatus.LININGUP;
                    this.hasTakeoffClearance = true;
                    this.say("Cleared for takeoff " + ttsizeRunway(runway));
                }
                else
                {
                    this.say("Unable to comply, I'm not at runway.");
                }
            }
        }
    }
});