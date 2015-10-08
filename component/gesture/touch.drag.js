define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks
    var dragGesture = {
        events: ['dragstart', 'drag', 'dragend'],
        touchstart: function (event) {
            gestureHooks.start(event, avalon.noop)
        },
        touchmove: function (event) {
            gestureHooks.move(event, function (pointer, touch) {
                var extra = {
                    deltaX: pointer.deltaX,
                    deltaY: pointer.deltaY,
                    touch: touch,
                    touchEvent: event,
                    isVertical: pointer.isVertical
                }
                if ((pointer.status === 'tapping') && pointer.distance > 10) {
                    pointer.status = 'panning';
                    gestureHooks.fire(pointer.element, 'dragstart', extra)
                } else if (pointer.status === 'panning') {
                    gestureHooks.fire(pointer.element, 'drag', extra)
                }
            })

            event.preventDefault();
        },
        touchend: function (event) {
            gestureHooks.end(event, function (pointer, touch) {
                if (pointer.status === 'panning') {
                    gestureHooks.fire(pointer.element, 'dragend', {
                        deltaX: pointer.deltaX,
                        deltaY: pointer.deltaY,
                        touch: touch,
                        touchEvent: event,
                        isVertical: pointer.isVertical
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