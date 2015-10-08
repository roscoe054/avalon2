define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks
    var dragGesture = {
        events: ['dragstart', 'drag', 'dragend'],
        touchstart: function (event) {
            gestureHooks.start(event, avalon.noop)
        },
        touchmove: function (event) {
            gestureHooks.move(event, function (gesture, touch) {
                var extra = {
                    deltaX: touch.clientX - gesture.startTouch.clientX,
                    deltaY: touch.clientY - gesture.startTouch.clientY,
                    touch: touch,
                    touchEvent: event,
                    isVertical: gesture.isVertical
                }
                if ((gesture.status === 'tapping') && gesture.distance > 10) {
                    gesture.status = 'panning';
                    gestureHooks.fire(gesture.element, 'dragstart', extra)
                } else if (gesture.status === 'panning') {
                    gestureHooks.fire(gesture.element, 'drag', extra)
                }
            })

            event.preventDefault();
        },
        touchend: function (event) {
            gestureHooks.end(event, function (gesture, touch) {
                if (gesture.status === 'panning') {
                    gestureHooks.fire(gesture.element, 'dragend', {
                        deltaX: touch.clientX - gesture.startTouch.clientX,
                        deltaY: touch.clientY - gesture.startTouch.clientY,
                        touch: touch,
                        touchEvent: event,
                        isVertical: gesture.isVertical
                    })
                }
            })
            gestureHooks.pointers = {}
        }
    }
    dragGesture.touchcancel = dragGesture.touchend

    gestureHooks.add('drag', dragGesture)
    return avalon
})