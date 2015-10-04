var swipeGesture = {
    events: ['swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown'],
    touchstart: function (event) {
        startGesture(event, noop)
    },
    touchmove: function (event) {
        moveGesture(event, noop)
    },
    touchend: function (event) {
        endGesture(event, function (gesture, touch) {
            var now = Date.now()
            var isflick = (gesture.distance > 100 && gesture.distance / gesture.duration > 0.65)

            if (isflick) {
                var displacementX = touch.clientX - gesture.startTouch.clientX
                var displacementY = touch.clientY - gesture.startTouch.clientY
                var extra = {
                    duration: now - gesture.startTime,
                    isflick: isflick,
                    displacementX: displacementX,
                    displacementY: displacementY,
                    touch: touch,
                    touchEvent: event,
                    isVertical: gesture.isVertical
                }
                var target = gesture.element,
                        dir
                fireGesture(target, 'swipe', extra)

                if (gesture.isVertical) {
                    dir = displacementY > 0 ? 'down' : 'up'
                } else {
                    dir = displacementY > 0 ? 'right' : 'left'
                }
                fireGesture(target, 'swipe' + dir, extra)
            }
        })
    }
}

swipeGesture.touchcancel = swipeGesture.touchend
avalon.gestureHooks.add('swipe', swipeGesture)
