
$(function () {
    var inputfield = $('#commandInput');
    var lastCallsign = "";

    inputfield.keyup(function(e) {
        inputfield.val(inputfield.val().toUpperCase());
        var key = e.which;
        var textCommand = inputfield.val();
        var command = textCommand.trim().split(' ');

        if (key != 8 && textCommand.length > 6) { // input helper

            var replace = "";

            switch (command.length) {
                case 2:
                    switch (command[1]) {
                        case "T": replace = "TURN"; break;
                        case "A": replace = "ALTITUDE"; break;
                        case "D": replace = "DESCEND"; break;
                        case "E": replace = "EXPEDITE"; break;
                        case "S": replace = "SPEED"; break;
                        case "C": replace = "CLEARED"; break;
                        case "H": replace = "HEAD"; break;
                        case "X": replace = "TAXI"; break;
                        case "O": replace = "CONTACT"; break;
                    }
                    break;

                case 3:
                    switch (command[1])
                    {
                        case "CLEARED":
                            switch (command[2]) {
                                case "L": replace = "LAND"; break;
                                case "O": replace = "TAKEOFF"; break;
                            }
                            break;
                        case "CONTACT":
                            switch (command[2]) {
                                case "G": replace = "GROUND"; break;
                                case "C": replace = "CLEARANCE"; break;
                                case "D": replace = "DEPARTURE"; break;
                            }
                            break;
                        case "TAXI":
                            switch (command[2]) {
                                case "R": replace = "RUNWAY"; break;
                                case "G": replace = "GATE"; break;
                                case "P": replace = "PARKING"; break;
                            }
                    }


            }

            if (replace != "") {
                inputfield.val(textCommand.substr(0, textCommand.length - 1) + replace + " ");
            }
        }
    });

    inputfield.keydown(function(e) {
        var textCommand = inputfield.val();
        var command = textCommand.trim().split(' ');
        var key = e.which;

        if (key == 0 || key == 32) {
            if (textCommand.substr(textCommand.length - 1, 1) === ' ') {
                e.preventDefault();
            }

        } else if (key == 38) { // up
            inputfield.val(lastCallsign + ' ');

        } else if (key == 13 && textCommand.length != 0) { // enter


            if (command.length < 2) {
                showIncomm('Tower, say again.');
                return;
            }

            var callsign = command[0];
            var planeId = -1;
            for (var i in aircraft) {
                if (aircraft.hasOwnProperty(i)) {
                    if (aircraft[i].callsign === callsign) {
                        planeId = i;
                        break;
                    }
                }
            }

            if (planeId == -1) {
                showIncomm('Invalid callsign ' + callsign);
                inputfield.val('');
                return;
            }

            lastCallsign = callsign;

            switch (command[1]) {
                case "TURN":
                case "T":
                    if ( command.length < 3
                        || isNaN(command[2])) {
                        aircraft[planeId].say("Say again direction.");
                    } else {
                        aircraft[planeId].turn(command[2]);
                    }
                    break;
                case "ALTITUDE":
                case "DESCEND":
                case "A":
                case "D":
                    if ( command.length < 3
                        || isNaN(command[2])
                        && (command[2].substr(0, 2) != "FL" && isNaN(command[2].substr(2)))) {
                        aircraft[planeId].say("Say again altitude.");
                    } else {
                        aircraft[planeId].changeAltitude(command[2]);
                    }
                    break;
                case "EXPEDITE":
                case "E":
                    aircraft[planeId].expedite();
                    break;
                case "SPEED":
                case "S":
                    if ( command.length < 3
                        || isNaN(command[2])) {
                        aircraft[planeId].say("Say again speed.");
                    } else {
                        aircraft[planeId].changeSpeed(command[2]);
                    }
                    break;
                case "CLEARED":
                case "C":
                    if (command.length < 4) {
                        aircraft[planeId].say("Say again.");
                    } else {
                        switch (command[2]) {
                            case "LAND":
                            case "L":
                                if ( command.length < 4) {
                                    aircraft[planeId].say("Say again runway.");
                                } else {
                                    aircraft[planeId].landILS(activeAirport, command[3]);
                                }
                                break;
                            case "TAKEOFF":
                            case "O":
                                if (command.length < 4) {
                                    aircraft[planeId].say("Say again runway.");
                                } else {
                                    aircraft[planeId].takeoff(activeAirport, command[3]);
                                }
                                break;
                        }
                    }
                    break;

                case "HEAD":
                case "H":
                    if (command.length < 3) {
                        aircraft[planeId].say("Say again waypoint.");
                    } else {
                        var found = false;
                        for (i = 0; i < waypoints.length; ++i) {
                            if (waypoints[i].name == command[2]) {
                                aircraft[planeId].targetWP(waypoints[i]);
                                found = true;
                                break;
                            }
                        }
                        if ( !found ) {
                            aircraft[planeId].say("Say again waypoint.");
                        }
                    }
                    break;
                case "CONTACT":
                case "O":
                    switch (command[2])
                    {
                        case "GROUND":
                        case "G":
                            aircraft[planeId].changeFreq(Frequency.GROUND);
                            break;
                        case "DEPARTURE":
                        case "D":
                            aircraft[planeId].changeFreq(Frequency.DEPARTURE);
                            break;
                        case "CLEARANCE":
                        case "C":
                            aircraft[planeId].changeFreq(Frequency.CLEARANCE);
                            break;
                    }
                    break;
                case "TAXI":
                case "X":
                    switch (command[2])
                    {
                        case "RUNWAY":
                            if (command.length < 4)
                            {
                                aircraft[planeId].say("Say again target.");
                            }
                            else
                            {
                                aircraft[planeId].taxiTo(TaxiTarget.RUNWAY, activeAirport, command[3]);
                            }
                            break;
                        case "GATE":
                            break;
                        case "PARKING":
                            break;
                    }
                    break;
                default:
                    aircraft[planeId].say("Say again.");
            }

            inputfield.val('');

        } else if (key != 8 && textCommand.length == 6) { // backspace
            inputfield.val(textCommand + ' ');
        }
    });
});