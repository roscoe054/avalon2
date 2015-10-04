var lastTap = null
function cancelPress(gesture) {
    clearTimeout(gesture.pressingHandler)
    gesture.pressingHandler = null
}
var pressGesture = {
    events: ['longtap', 'doubletap'],
    touchstart: function (event) {
        startGesture(event, function (gesture, event) {
            gesture.pressingHandler = setTimeout(function () {
                if (gesture.status === 'tapping') {
                    gesture.status = 'pressing'
                    fireGesture(event.target, 'longtap', {
                        touchEvent: event
                    })
                }
                cancelPress(gesture)
            }, 500)
        })
    },
    touchmove: function (event) {
        moveGesture(event, function (gesture) {

            if (gesture.distance > 10 && gesture.pressingHandler) {
                cancelPress(gesture)

                if (gesture.status === 'tapping' || gesture.status === 'pressing') {
                    gesture.status = 'panning'
                }
            }
        })
    },
    touchend: function (event) {
        endGesture(event, function (gesture, touch) {
            cancelPress(gesture)

            if (gesture.status === 'tapping') {
                gesture.timestamp = Date.now()

                if (lastTap && gesture.timestamp - lastTap.timestamp < 300) {
                    fireGesture(gesture.element, 'doubletap', {
                        touch: touch,
                        touchEvent: event
                    })
                }

                lastTap = gesture
            }
        })

    },
    touchcancel: function (event) {
        endGesture(event, function (gesture) {
            cancelPress(gesture)
        })
    }
}
avalon.gestureHooks.add('press', pressGesture)
