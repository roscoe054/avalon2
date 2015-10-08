var swipeGesture = {
    events: ['swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown'],
    getAngle: function (x, y) {
        var r = Math.atan2(y, x) //radians
        var angle = Math.round(r * 180 / Math.PI) //degrees
        return angle < 0 ? 360 - Math.abs(angle) : angle
    },
    getDirection: function (x, y) {
        var angle = swipeGesture.getAngle(x, y)
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
        gestureHooks.start(event, noop)
    },
    touchmove: function (event) {
        gestureHooks.move(event, noop)
    },
    touchend: function (event) {
        if(event.changedTouches.length !== 1){
            return
        }
        gestureHooks.end(event, function (gesture, touch) {
            var isflick = (gesture.distance > 30 && gesture.distance / gesture.duration > 0.65)
            if (isflick) {
                var deltaX = touch.clientX - gesture.startTouch.clientX
                var deltaY = touch.clientY - gesture.startTouch.clientY
                var extra = {
                    deltaX : deltaX,
                    deltaY: deltaY,
                    touch: touch,
                    touchEvent: event,
                    direction:  swipeGesture.getDirection(deltaX, deltaY),
                    isVertical: gesture.isVertical
                }
                var target = gesture.element
                gestureHooks.fire(target, 'swipe', extra)
                gestureHooks.fire(target, 'swipe' + extra.direction, extra)
            }
        })
    }
}

swipeGesture.touchcancel = swipeGesture.touchend
gestureHooks.add('swipe', swipeGesture)

