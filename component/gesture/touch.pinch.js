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

    /**
     * 计算变换效果
     * 假设坐标系上有4个点ABCD
     * > 旋转：从AB旋转到CD的角度
     * > 缩放：从AB长度变换到CD长度的比例
     * > 位移：从A点位移到C点的横纵位移
     *
     * @param  {number} x1 上述第1个点的横坐标
     * @param  {number} y1 上述第1个点的纵坐标
     * @param  {number} x2 上述第2个点的横坐标
     * @param  {number} y2 上述第2个点的纵坐标
     * @param  {number} x3 上述第3个点的横坐标
     * @param  {number} y3 上述第3个点的纵坐标
     * @param  {number} x4 上述第4个点的横坐标
     * @param  {number} y4 上述第4个点的纵坐标
     * @return {object}    变换效果，形如{rotate, scale, translate[2], matrix[3][3]}
     */
    var calc = function (x1, y1, x2, y2, x3, y3, x4, y4) {
        var rotate = Math.atan2(y4 - y3, x4 - x3) - Math.atan2(y2 - y1, x2 - x1),
                scale = Math.sqrt((Math.pow(y4 - y3, 2) + Math.pow(x4 - x3, 2)) / (Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2))),
                translate = [x3 - scale * x1 * Math.cos(rotate) + scale * y1 * Math.sin(rotate), y3 - scale * y1 * Math.cos(rotate) - scale * x1 * Math.sin(rotate)];
        return {
            rotate: rotate,
            scale: scale,
            translate: translate,
            matrix: [
                [scale * Math.cos(rotate), -scale * Math.sin(rotate), translate[0]],
                [scale * Math.sin(rotate), scale * Math.cos(rotate), translate[1]],
                [0, 0, 1]
            ]
        };
    }

    var pinchGesture = {
        events: ['pinchstart', 'pinch', 'pinchin', 'pinchuut', 'pinchend'],
        touchstart: function (event) {
            var pointers = gestureHooks.pointers
            gestureHooks.start(event, avalon.noop)

            var elements = []
            for (var p in pointers) {
                if (pointers[p].startTime) {
                    elements.push(pointers[p].element)
                }else{
                    delete pointers[p]
                }
            }
            pointers.elements = elements
            if (elements.length === 2) {
                gestureHooks.fire(getCommonAncestor(elements), 'pinchstart', {
                    touches: event.touches,
                    touchEvent: event
                })

            }
        },
        touchmove: function (event) {
            var elements = gestureHooks.pointers.elements || []
            if (elements.length === 2) {
                var position = [],
                        current = [],
                        transform


                // TODO: 变量声明方式，建议在函数最前面声明
                for (var i = 0; i < event.touches.length; i++) {
                    var touch = event.touches[i];
                    var gesture = gestureHooks.pointers[touch.identifier];
                    position.push([gesture.startTouch.clientX, gesture.startTouch.clientY]);
                    current.push([touch.clientX, touch.clientY]);
                }



                transform = calc(position[0][0], position[0][1], position[1][0], position[1][1], current[0][0], current[0][1], current[1][0], current[1][1]);

                gestureHooks.fire(getCommonAncestor(elements), 'pinch', {
                    scale: transform.scale,
                    touches: event.touches,
                    touchEvent: event
                })


                if (transform.scale > 1) {
                    gestureHooks.fire(getCommonAncestor(elements), 'pinchout', {
                        transform: transform,
                        touches: event.touches,
                        touchEvent: event
                    })

                } else {
                    gestureHooks.fire(getCommonAncestor(elements), 'pinchin', {
                        transform: transform,
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