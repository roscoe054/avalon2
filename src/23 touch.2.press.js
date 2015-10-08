
var pressGesture = {
    events: ['longtap', 'doubletap'],
    cancelPress: function (pointer) {
        clearTimeout(pointer.pressingHandler)
        pointer.pressingHandler = null
    },
    touchstart: function (event) {
        gestureHooks.start(event, function (pointer, touch) {
            pointer.pressingHandler = setTimeout(function () {
                if (pointer.status === 'tapping') {
                    gestureHooks.fire(event.target, 'longtap', {
                        touch: touch,
                        touchEvent: event
                    })
                }
                pressGesture.cancelPress(pointer)
            }, 500)
            if (event.changedTouches.length !== 1) {
                pointer.status = 0
            }
        })

    },
    touchmove: function (event) {
        gestureHooks.move(event, function (pointer) {
            if (pointer.distance > 10 && pointer.pressingHandler) {
                pressGesture.cancelPress(pointer)
                if (pointer.status === 'tapping') {
                    pointer.status = 'panning'
                }
            }
        })
    },
    touchend: function (event) {
        gestureHooks.end(event, function (pointer, touch) {
            pressGesture.cancelPress(pointer)
            if (pointer.status === 'tapping') {
                pointer.lastTime = Date.now()
                if (pressGesture.lastTap && pointer.lastTime - pressGesture.lastTap.lastTime < 300) {
                    gestureHooks.fire(pointer.element, 'doubletap', {
                        touch: touch,
                        touchEvent: event
                    })
                }

                pressGesture.lastTap = pointer
            }
        })

    },
    touchcancel: function (event) {
        gestureHooks.end(event, function (pointer) {
            pressGesture.cancelPress(pointer)
        })
    }
}
gestureHooks.add('press', pressGesture)
