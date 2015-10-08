define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks

    /**
     * 找到两个结点共同的最小根结点
     * 如果跟结点不存在，则返回null
     *
     * @param  {Element} el1 第一个结点
     * @param  {Element} el2 第二个结点
     * @return {Element}     根结点
     */
    var getCommonAncestor = function (arr) {
        var el = arr[0], el2 = arr[1]
        while (el) {
            if (el.contains(el2) || el === el2) {
                return el;
            }
            el = el.parentNode;
        }
        return null;
    }


    var pinchGesture = {
        events: ['pinchstart', 'pinch', 'pinchin', 'pinchuot', 'pinchend'],
        getScale: function (x1, y1, x2, y2, x3, y3, x4, y4) {
            return Math.sqrt((Math.pow(y4 - y3, 2) + Math.pow(x4 - x3, 2)) / (Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2)))
        },
        touchstart: function (event) {
            var pointers = gestureHooks.pointers
            gestureHooks.start(event, avalon.noop)
            var elements = []
            for (var p in pointers) {
                if (pointers[p].startTime) {
                    elements.push(pointers[p].element)
                } else {
                    delete pointers[p]
                }
            }
            pointers.elements = elements
            if (elements.length === 2) {
                gestureHooks.fire(getCommonAncestor(elements), 'pinchstart', {
                    scale: 1,
                    touches: event.touches,
                    touchEvent: event
                })

            }
        },
        touchmove: function (event) {
            var elements = gestureHooks.pointers.elements || []
            if (elements.length === 2) {
                var position = [],
                        current = []

                // TODO: 变量声明方式，建议在函数最前面声明
                for (var i = 0; i < event.touches.length; i++) {
                    var touch = event.touches[i];
                    var gesture = gestureHooks.pointers[touch.identifier];
                    position.push([gesture.startTouch.clientX, gesture.startTouch.clientY]);
                    current.push([touch.clientX, touch.clientY]);
                }

                var scale = calc(position[0][0], position[0][1], position[1][0], position[1][1], current[0][0], current[0][1], current[1][0], current[1][1]);
                pinchGesture.scale = scale
                gestureHooks.fire(getCommonAncestor(elements), 'pinch', {
                    scale: scale,
                    touches: event.touches,
                    touchEvent: event
                })


                if (scale > 1) {
                    gestureHooks.fire(getCommonAncestor(elements), 'pinchout', {
                        scale: scale,
                        touches: event.touches,
                        touchEvent: event
                    })

                } else {
                    gestureHooks.fire(getCommonAncestor(elements), 'pinchin', {
                        scale: scale,
                        touches: event.touches,
                        touchEvent: event
                    })
                }
            }
            event.preventDefault()
        },
        touchend: function (event) {
            var elements = gestureHooks.pointers.elements || []
            if (elements.length === 2) {

                gestureHooks.fire(getCommonAncestor(elements), 'pinchend', {
                    scale: pinchGesture.scale,
                    touches: event.touches,
                    touchEvent: event
                })
            }
            gestureHooks.end(event, avalon.noop)
        }
    }

    pinchGesture.touchcancel = pinchGesture.touchend

    gestureHooks.add('pinch', pinchGesture)
    return avalon
})