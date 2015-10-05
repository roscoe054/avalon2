var swipeGesture = {
    events: ['swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown'],
    touchstart: function (event) {
        gestureHooks.start(event, noop)
    },
    touchmove: function (event) {
        gestureHooks.move(event, noop)
    },
    touchend: function (event) {
        gestureHooks.end(event, function (gesture, touch) {
            var now = Date.now()
            var isflick = (gesture.distance > 30 && gesture.distance / gesture.duration > 0.65)

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
                gestureHooks.fire(target, 'swipe', extra)

                if (gesture.isVertical) {
                    dir = displacementY > 0 ? 'down' : 'up'
                } else {
                    dir = displacementY > 0 ? 'right' : 'left'
                }
                gestureHooks.fire(target, 'swipe' + dir, extra)
            }
        })
    }
}

swipeGesture.touchcancel = swipeGesture.touchend
gestureHooks.add('swipe', swipeGesture)
