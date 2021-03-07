
var aircraftDivs = [];

var Radar = IGui.extend(function() {
    return {
        init: function() {
            this.canvas = $('#map');
            this.list = $('#aircraftList');

        },

        adjustElementsSize: function() {
            var canvas = document.getElementById('map');

            canvasWidthPix = window.innerWidth - 330;
            canvasHeightPix = window.innerHeight - 70;
            canvas.width = canvasWidthPix;
            canvas.height = canvasHeightPix;
            canvasWidthKm = canvasWidthPix * 0.13;

            $('#aircraftList').css("height", canvasHeightPix);
            $('#aircraftList').css("max-height", canvasHeightPix);
            $('#commandInput').css("width", canvasWidthPix);
        },

        drawCanvas: function() {
            var context = this.canvas[0].getContext('2d');

            context.clearRect(0, 0, this.canvas[0].width, this.canvas[0].height);

            context.save();

            context.translate(canvasWidthPix / 2, canvasHeightPix / 2);
            context.translate(mToPix(canvasCenterX), mToPix(canvasCenterY));

            for (var i in waypoints) {
                if (waypoints.hasOwnProperty(i)) {
                    this.drawWaypoint(context, waypoints[i]);
                }
            }

            for (i in airports) {
                if (airports.hasOwnProperty(i)) {
                    this.drawAirport(context, airports[i]);
                }
            }

            for (i in aircraft) {
                if (aircraft.hasOwnProperty(i)) {
                    this.drawAircraft(context, aircraft[i]);
                }
            }

            context.restore();
        },

        drawWaypoint: function(context, waypoint) {
            var x = mToPix(waypoint.x);
            var y = mToPix(waypoint.y);

            context.beginPath();

            // Triangle
            context.moveTo(x, y - 5);
            context.lineTo(x + 4, y + 4);
            context.lineTo(x - 4, y + 4);
            context.lineTo(x, y - 5);

            context.strokeStyle = '#66c';
            context.stroke();

            context.fillStyle = '#66c';

            // Name
            context.fillText(waypoint.name, x + 6, y);
        },

        drawAirport: function(context, airport) {
            var x = mToPix(airport.x);
            var y = mToPix(airport.y);

            // Runway centerlines
            context.beginPath();

            for (var i = 0; i < airport.params.runways.length; ++i) {
                context.moveTo(x + mToPix(airport.params.rwyhp1x[i]), y + mToPix(airport.params.rwyhp1y[i]));
                context.lineTo(x + mToPix(airport.params.rwyhp2x[i]), y + mToPix(airport.params.rwyhp2y[i]));
            }

            context.strokeStyle = '#666';
            context.stroke();

            // Runways
            context.beginPath();
            for (i = 0; i < airport.params.runways.length; ++i) {
                context.moveTo(x + mToPix(airport.params.rwyp1x[i]), y + mToPix(airport.params.rwyp1y[i]));
                context.lineTo(x + mToPix(airport.params.rwyp2x[i]), y + mToPix(airport.params.rwyp2y[i]));
            }

            context.lineWidth = runwayWidth;
            context.strokeStyle = '#ccc';
            context.stroke();

            // ILS cones
            // TODO

            // Runway names
            context.fillStyle = '#fff';

            for (i = 0; i < airport.params.runways.length; ++i) {
                var rwynames = (airport.params.runways[i]).split('/');
                context.fillText(rwynames[1], x + mToPix(airport.params.rwyp1x[i]), y + mToPix(airport.params.rwyp1y[i]));
                context.fillText(rwynames[0], x + mToPix(airport.params.rwyp2x[i]), y + mToPix(airport.params.rwyp2y[i]));
            }

            context.lineWidth = 1;
            context.strokeStyle = '#999';

            // Circles
            for (i = 1; i <= airportCircleCount; ++i) {
                context.beginPath();
                context.arc(x, y, mToPix(i * airportCircleDistance), 0, 2 * Math.PI, false);

                context.strokeStyle = "#666";
                context.stroke();

                // Km marker
                context.fillText(Math.round(i * airportCircleDistance / 1609),
                    x + mToPix(i * airportCircleDistance), y);
            }
        },

        drawAircraft: function(context, aircraft) {
            var x = mToPix(aircraft.x);
            var y = mToPix(aircraft.y);

            context.beginPath();
            context.lineWidth = 1;

            // Square
            context.rect(x - 3, y - 3, 6, 6);
            context.fillStyle = isCrashed(aircraft.state) ? '#f00' : '#fff';
            context.fill();

            //context.strokeStyle = '#fff';
            //context.stroke();

            // Trail
            context.beginPath();
            context.moveTo(x, y);
            // Substract as we draw trails, not speed vectors
            context.lineTo(x - Math.sin(toRad(aircraft.direction)) * aircraft.speed * speedTrailMultiplier,
                y + Math.cos(toRad(aircraft.direction)) * aircraft.speed * speedTrailMultiplier);

            context.strokeStyle = '#ccc';
            context.stroke();

            context.fillStyle = isCrashed(aircraft.state) ? 'red' : 'yellow';

            // Texts
            // Callsign
            context.beginPath();
            context.fillText(aircraft.callsign, x - 30, y - 8);
            // Altitude
            var dText = "";
            if (aircraft.targetalt != null && aircraft.targetalt != aircraft.altitude) {
                // Currently climbing or descending
                var climb = aircraft.targetalt > aircraft.altitude;
                dText = climb ? String.fromCharCode(8593) : String.fromCharCode(8595);
            }
            context.beginPath();
            context.fillText(formatAlt(aircraft.altitude) + dText, x - 30, y + 15);

            // Speed
            dText = "";
            if (aircraft.targetspeed != null && aircraft.targetspeed != aircraft.speed) {
                var accelerate = aircraft.targetspeed > aircraft.speed;
                dText = accelerate ? String.fromCharCode(8593) : String.fromCharCode(8595);
            }
            context.beginPath();
            context.fillText(Math.round(aircraft.speed) + dText, x + 10, y + 15);

            // Debug lines
            if (aircraft.waypoint != null) {
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(mToPix(aircraft.waypoint.x), mToPix(aircraft.waypoint.y));
                context.strokeStyle = '#66c';
                context.stroke();
            }
            if (aircraft.ils != null) {
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(mToPix(aircraft.ils.rwyNearendX), mToPix(aircraft.ils.rwyNearendY));
                context.strokeStyle = '#6c6';
                context.stroke();
            }
        },

        refrestLists: function() {
            for (var i in aircraft) {
                if (aircraft.hasOwnProperty(i)) {
                    var target = "";
                    switch (aircraft[i].state) {
                        case PlaneStatus.FLYDIR:
                            target = Math.round(aircraft[i].targetdir); break;
                        case PlaneStatus.FLYWYPT:
                            target = aircraft[i].waypoint.name; break;
                        case PlaneStatus.GLIDE_INTERSECT:
                        case PlaneStatus.GLIDE_ILS:
                        case PlaneStatus.GLIDE_VISUAL:
                            target = aircraft[i].ils.runway; break;
                        case PlaneStatus.TAXIING:
                            if (PlaneGoal.DEPARTING) target = aircraft[i].targetRunway.runway; break;
                        case PlaneStatus.LININGUP:
                            target = aircraft[i].targetRunway.runway; break;
                    }

                    $('#tgtName' + aircraft[i].id).html(target);

                    $('#direction' + aircraft[i].id).html(Math.round(aircraft[i].direction));
                    $('#targetdir' + aircraft[i].id).html(Math.round(aircraft[i].targetdir));
                    $('#speed' + aircraft[i].id).html(Math.round(aircraft[i].speed));
                    $('#targetspeed' + aircraft[i].id).html(Math.round(aircraft[i].targetspeed));
                    $('#altitude' + aircraft[i].id).html(formatAlt(aircraft[i].altitude));
                    $('#targetalt' + aircraft[i].id).html(formatAlt(aircraft[i].targetalt));
                    $('#state' + aircraft[i].id).html(readableState(aircraft[i].state));
                }
            }
        },

        refresh: function() {
            this.drawCanvas();
            this.refrestLists();
        },

        registerAircraft: function(aircraft) {
            $('#aircraftList').append(
                '<div class="plane ' + goalName(aircraft.goal) + '" id="plane' + aircraft.id + '">' +
                    '<div class="planeLeft">' +
                        '<span class="plCallsign" id="callsign' + aircraft.id + '">' + aircraft.callsign + '</span>' +
                        '<br>' +
                        '<span class="plState" id="state' + aircraft.id + '"></span>' +
                        ' ' +
                        '<span class="plTgtName" id="tgtName' + aircraft.id + '"></span>' +
                        //'<br>' +
                        //'<img src="img/' + CompanyNames[Companies.indexOf(aircraft.callsign.substr(0, 3))] + '.png">' +
                        '<br>' +
                        '<span class="plType" id="type' + aircraft.id + '">' + aircraft.type + '</span>' +
                    '</div>' +
                    '<div class="planeRight">' +
                        'H <span class="plDir" id="direction' + aircraft.id + '"></span> / <span class="plTgtDir" id="targetdir' + aircraft.id + '"></span>' +
                        '<br>' +
                        'S <span class="plSpd" id="speed' + aircraft.id + '"></span> / <span class="plTgtSpd" id="targetspeed' + aircraft.id + '"></span>' +
                        '<br>' +
                        'A <span class="plAlt" id="altitude' + aircraft.id + '"></span> / <span class="plTgtAlt" id="targetalt' + aircraft.id + '"></span>' +
                    '</div>' +
                '</div>');
            var div = $('#plane' + aircraft.id);
            aircraftDivs[aircraft.id] = div;

            div.click(function() {
                var inputField = $('#commandInput');
                inputField.val(aircraft.callsign + " ");
                inputField.focus();
            });
        },

        deregisterAircraft: function(aircraft) {
            aircraftDivs.splice(aircraft.id, 1);
            $('#plane' + aircraft.id).remove();
        }

    }
});

