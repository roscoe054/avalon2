var swipeGesture = {
    events: ['swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown'],
    getAngle: function (x, y) {
        var r = Math.atan2(y, x) //radians
        var angle = Math.round(r * 180 / Math.PI) //degrees
        return angle < 0 ? 360 - Math.abs(angle) : angle
    },
    getDirection: function (startPoint, endPoint) {
        var angle = swipeGesture.getAngle(startPoint, endPoint)
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
            var now = Date.now()
            var isflick = (gesture.distance > 30 && gesture.distance / gesture.duration > 0.65)

            if (isflick) {
                var displacementX = touch.clientX - gesture.startTouch.clientX
                var displacementY = touch.clientY - gesture.startTouch.clientY
                var extra = {
                    duration: now - gesture.startTime,
                    displacementX: displacementX,
                    displacementY: displacementY,
                    touch: touch,
                    touchEvent: event,
                    isVertical: gesture.isVertical
                }
                var target = gesture.element
                gestureHooks.fire(target, 'swipe', extra)
                
                var dir = swipeGesture.getDirection(displacementX, displacementY)

                gestureHooks.fire(target, 'swipe' + dir, extra)
            }
        })
    }
}

swipeGesture.touchcancel = swipeGesture.touchend
gestureHooks.add('swipe', swipeGesture)

