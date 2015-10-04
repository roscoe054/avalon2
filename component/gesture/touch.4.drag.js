var dragGesture = {
    events: ['dragstart', 'drag', 'dragend'],
    touchstart: function (event) {
        startGesture(event, noop)
    },
    touchmove: function (event) {
        moveGesture(event, function (gesture, touch) {
            if ((gesture.status === 'tapping') && gesture.distance > 10) {
                gesture.status = 'panning';
                fireGesture(gesture.element, 'dragstart', {
                    touch: touch,
                    touchEvent: event,
                    isVertical: gesture.isVertical
                })
            }

            if (gesture.status === 'panning') {
                fireGesture(gesture.element, 'drag', {
                    touch: touch,
                    touchEvent: event,
                    isVertical: gesture.isVertical
                })
            }
        })

        event.preventDefault();
    },
    touchend: function (event) {
        moveGesture(event, function (gesture, touch) {
            if (gesture.status === 'panning') {
                fireGesture(gesture.element, 'dragend', {
                    touch: touch,
                    touchEvent: event
                })
            }
        })
    }
}
dragGesture.touchcancel = dragGesture.touchend

avalon.gestureHooks.add('drag', dragGesture)
