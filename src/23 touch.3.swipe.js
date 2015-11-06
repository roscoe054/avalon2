var swipeRecognizer = {
    events: ['swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown'],
    getAngle: function (x, y) {
        var r = Math.atan2(y, x) //radians
        var angle = Math.round(r * 180 / Math.PI) //degrees
        return angle < 0 ? 360 - Math.abs(angle) : angle
    },
    getDirection: function (x, y) {
        var angle = swipeRecognizer.getAngle(x, y)
        if ((angle <= 45) && (angle >= 0)) {
            return "left"
        } else if ((angle <= 360) && (angle >= 315)) {
            return "left"
        } else if ((angle >= 135) && (angle <= 225)) {
            return "right"
        } else if ((angle > 45) && (angle < 135)) {
            return "down"
        } else {
            return "up"
        }
    },
    touchstart: function (event) {
        Recognizer.start(event, noop)
    },
    touchmove: function (event) {
        Recognizer.move(event, noop)
    },
    touchend: function (event) {
        if(event.changedTouches.length !== 1){
            return
        }
        Recognizer.end(event, function (pointer, touch) {
            var isflick = (pointer.distance > 30 && pointer.distance / pointer.duration > 0.65)
            if (isflick) {
                var extra = {
                    deltaX : pointer.deltaX,
                    deltaY: pointer.deltaY,
                    touch: touch,
                    touchEvent: event,
                    direction:  swipeRecognizer.getDirection(pointer.deltaX, pointer.deltaY),
                    isVertical: pointer.isVertical
                }
                var target = pointer.element
                Recognizer.fire(target, 'swipe', extra)
                Recognizer.fire(target, 'swipe' + extra.direction, extra)
            }
        })
    }
}

swipeRecognizer.touchcancel = swipeRecognizer.touchend
Recognizer.add('swipe', swipeRecognizer)

