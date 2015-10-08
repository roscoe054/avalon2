define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks
    var dragGesture = {
        events: ['dragstart', 'drag', 'dragend'],
        touchstart: function (event) {
            gestureHooks.start(event, avalon.noop)
        },
        touchmove: function (event) {
            gestureHooks.move(event, function (gesture, touch) {
                if ((gesture.status === 'tapping') && gesture.distance > 10) {
                    gesture.status = 'panning';
                    gestureHooks.fire(gesture.element, 'dragstart', {
                        touch: touch,
                        touchEvent: event,
                        isVertical: gesture.isVertical
                    })
                }else if (gesture.status === 'panning') {
                    gestureHooks.fire(gesture.element, 'drag', {
                        touch: touch,
                        touchEvent: event,
                        isVertical: gesture.isVertical
                    })
                }
            })

            event.preventDefault();
        },
        touchend: function (event) {
            gestureHooks.end(event, function (gesture, touch) {
                if (gesture.status === 'panning') {
                    gestureHooks.fire(gesture.element, 'dragend', {
                        touch: touch,
                        touchEvent: event
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