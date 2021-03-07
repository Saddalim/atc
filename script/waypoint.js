/**
 * Created by Lord Saddalim on 2015.07.30..
 */

var Waypoint = Fiber.extend(function() {
    return {
        init: function(name, x, y) {
            this.x = x;
            this.y = y;
            this.name = name;
        },
        draw: function(context, x, y) {

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
            context.fillText(this.name, x + 6, y);

        }
    }
});