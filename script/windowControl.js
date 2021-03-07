
var Speed = {
    NORMAL: 1.0,
    DOUBLE: 2.0,
    QUAD: 4.0
};





$(function() {
    var muteBtn = $('#muteBtn');
    var pauseBtn = $('#pauseBtn');



    muteBtn.click(function() {
        if (muted)
        {
            muted = false;
            muteBtn.html('Mute');
        }
        else
        {
            muted = true;
            muteBtn.html('Unmute');
        }
    });

    pauseBtn.click(function() {
        if (paused)
        {
            paused = false;
            pauseBtn.html('Pause');
        }
        else
        {
            paused = true;
            pauseBtn.html('Unpause');
        }
    });

    var normalSpdBtn = $('#normalSpdBtn');
    var doubleSpdBtn = $('#doubleSpdBtn');
    var quadSpdBtn = $('#quadSpdBtn');

    function adjustSimulationSpeed(speed)
    {
        switch (speed)
        {
            case Speed.NORMAL:
                normalSpdBtn.prop('disabled', true);
                doubleSpdBtn.prop('disabled', false);
                quadSpdBtn.prop('disabled', false);
                speedMultiplier = 1.0;
                break;
            case Speed.DOUBLE:
                normalSpdBtn.prop('disabled', false);
                doubleSpdBtn.prop('disabled', true);
                quadSpdBtn.prop('disabled', false);
                speedMultiplier = 2.0;
                break;
            case Speed.QUAD:
                normalSpdBtn.prop('disabled', false);
                doubleSpdBtn.prop('disabled', false);
                quadSpdBtn.prop('disabled', true);
                speedMultiplier = 4.0;
                break;
        }
    }

    adjustSimulationSpeed(Speed.NORMAL);

    normalSpdBtn.click(function() {adjustSimulationSpeed(Speed.NORMAL)});
    doubleSpdBtn.click(function() {adjustSimulationSpeed(Speed.DOUBLE)});
    quadSpdBtn.click(function() {adjustSimulationSpeed(Speed.QUAD)});


});
