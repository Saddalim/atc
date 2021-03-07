
var Airport = Fiber.extend(function() {
    return {
        init: function(name, x, y) {
            this.name = name;
            this.x = x;
            this.y = y;

            this.params = getAirportParams(name);

            this.params.rwyp1x = [];
            this.params.rwyp1y = [];
            this.params.rwyp2x = [];
            this.params.rwyp2y = [];
            this.params.rwyhp1x = [];
            this.params.rwyhp1y = [];
            this.params.rwyhp2x = [];
            this.params.rwyhp2y = [];

            // Pre-calculate runway endpoints (in offset meters) for speedy drawing
            for (var i = 0; i <= this.params.runways.length; ++i) {
                var centerX = this.params.rwyoffsetX[i];
                var centerY = this.params.rwyoffsetY[i];
                var angle = this.params.rwyangle[i];
                var signP1X = angle >= 0 && angle < 180 ? 1 : -1; // TODO fordítva???
                var signP1Y = angle >= 90 && angle < 270 ? -1 : 1;
                var length = this.params.rwylength[i];

                this.params.rwyp1x[i] = centerX + Math.sin(toRad(angle)) * (length / 2) * signP1X;
                this.params.rwyp1y[i] = centerY + Math.cos(toRad(angle)) * (length / 2) * signP1Y;
                this.params.rwyp2x[i] = centerX + Math.sin(toRad(angle)) * (length / 2) * signP1X * -1;
                this.params.rwyp2y[i] = centerY + Math.cos(toRad(angle)) * (length / 2) * signP1Y * -1;

                // Centerlines
                this.params.rwyhp1x[i] = centerX + Math.sin(toRad(angle)) * runwayCenterlineLength * signP1X;
                this.params.rwyhp1y[i] = centerY + Math.cos(toRad(angle)) * runwayCenterlineLength * signP1Y;
                this.params.rwyhp2x[i] = centerX + Math.sin(toRad(angle)) * runwayCenterlineLength * signP1X * -1;
                this.params.rwyhp2y[i] = centerY + Math.cos(toRad(angle)) * runwayCenterlineLength * signP1Y * -1;
            }

            // Add airport-related waypoints
            switch (name) {
                case "LHBP":
                    waypoints.push(new Waypoint("TAPIO", x + 14 * 1000, y - 6 * 1000));
                    waypoints.push(new Waypoint("ABONY", x + 54 * 1000, y + 20 * 1000));
                    waypoints.push(new Waypoint("VEBOS", x - 46 * 1000, y + 16 * 1000));
                    waypoints.push(new Waypoint("MOKSA", x - 44 * 1000, y - 28 * 1000));
                    waypoints.push(new Waypoint("ERGOM", x - 36 * 1000, y - 40 * 1000));
                    waypoints.push(new Waypoint("MAMOS", x - 13 * 1000, y - 37 * 1000));
                    waypoints.push(new Waypoint("BP440", x - 23 * 1000, y - 9 * 1000));
                    waypoints.push(new Waypoint("BP434", x + 31 * 1000, y + 29 * 1000));
                    waypoints.push(new Waypoint("BP026", x + 9.2 * 1000, y + 9 * 1000));
                    waypoints.push(new Waypoint("BP534", x + 34 * 1000, y + 28 * 1000));
                    waypoints.push(new Waypoint("BP035", x + 12.1 * 1000, y + 9 * 1000));
                    break;
            }
        },

        getRunwayDetails: function(runway) {
            for (var i = 0; i < this.params.runways.length; ++i) {
                if ($.inArray(runway, this.params.runways[i].split('/')) != -1) {
                    var rwyDir = null;

                    // Runway is NaN if has side (L/R), trim last character then
                    if (isNaN(runway)) {
                        var trimmedRwy = runway.substr(0, runway.length - 1);
                        if ( !isNaN(trimmedRwy)) {
                            rwyDir = trimmedRwy;
                        }
                    } else {
                        rwyDir = runway;
                    }

                    rwyDir = +rwyDir;

                    if (rwyDir == null || isNaN(rwyDir)) {
                        console.error("Couldn't get runway direction of " + this.name + "'s " + runway);
                        return false;
                    }

                    // Get real runway angle
                    rwyDir = +(norm(rwyDir * 10));
                    // If runway name is the opposite of how runway angle is given, give its opposite
                    if (Math.abs(signedAngleBetween(rwyDir, this.params.rwyangle[i])) > 90) {
                        rwyDir =  norm(this.params.rwyangle[i] + 180);
                    } else {
                        rwyDir =  this.params.rwyangle[i];
                    }

                    var fromNorth = rwyDir < 90 || rwyDir > 270;

                    var retval = {};
                    retval.runway = runway;
                    retval.angle = rwyDir;
                    retval.rwyNearendX = fromNorth ? this.params.rwyp1x[i] : this.params.rwyp2x[i];
                    retval.rwyNearendY = fromNorth ? this.params.rwyp1y[i] : this.params.rwyp2y[i];
                    retval.rwyFarendX = !fromNorth ? this.params.rwyp1x[i] : this.params.rwyp2x[i];
                    retval.rwyFarendY = !fromNorth ? this.params.rwyp1y[i] : this.params.rwyp2y[i];
                    retval.airportX = this.x;
                    retval.airportY = this.y;
                    return retval;
                }
            }
            return false;
        }
    }
});