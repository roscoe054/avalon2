var lastTap = null
function cancelPress(gesture) {
    clearTimeout(gesture.pressingHandler)
    gesture.pressingHandler = null
}
var pressGesture = {
    events: ['longtap', 'doubletap'],
    touchstart: function (event) {
        gestureHooks.start(event, function (gesture, event) {
            gesture.pressingHandler = setTimeout(function () {
                if (gesture.status === 'tapping') {
                    gesture.status = 'pressing'
                    gestureHooks.fire(event.target, 'longtap', {
                        touchEvent: event
                    })
                }
                cancelPress(gesture)
            }, 500)
        })
    },
    touchmove: function (event) {
        gestureHooks.move(event, function (gesture) {

            if (gesture.distance > 10 && gesture.pressingHandler) {
                cancelPress(gesture)

                if (gesture.status === 'tapping' || gesture.status === 'pressing') {
                    gesture.status = 'panning'
                }
            }
        })
    },
    touchend: function (event) {
        gestureHooks.end(event, function (gesture, touch) {
            cancelPress(gesture)

            if (gesture.status === 'tapping') {
                gesture.timestamp = Date.now()

                if (lastTap && gesture.timestamp - lastTap.timestamp < 300) {
                    gestureHooks.fire(gesture.element, 'doubletap', {
                        touch: touch,
                        touchEvent: event
                    })
                }

                lastTap = gesture
            }
        })

    },
    touchcancel: function (event) {
        gestureHooks.end(event, function (gesture) {
            cancelPress(gesture)
        })
    }
}
gestureHooks.add('press', pressGesture)
