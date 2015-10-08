define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks

    // 角度， 范围在{0-180}， 用来识别旋转角度
    function getAngle180(p1, p2) {
        var agl = Math.atan((p2.pageY - p1.pageY) * -1 / (p2.pageX - p1.pageX)) * (180 / Math.PI)
        return (agl < 0 ? (agl + 180) : agl)
    }
    var rotateGesture = {
        events: ['rotate', 'rotateright', 'rotateleft'],
        touchstart: function (event) {
            var pointers = gestureHooks.pointers
            gestureHooks.start(event, avalon.noop)
            var finger
            for (var p in pointers) {
                if (pointers[p].startTime) {
                    if (!finger) {
                        finger = pointers[p]
                    } else {
                        return
                    }
                }
            }
            rotateGesture.finger = finger
            var el = finger.element
            var docOff = avalon(el).offset()
            rotateGesture.center = {
                pageX: docOff.left + el.offsetWidth / 2,
                pageY: docOff.top + el.offsetHeight / 2
            }
            rotateGesture.startAngel = parseInt(getAngle180(rotateGesture.center, finger.startTouch), 10)
        },
        touchmove: function (event) {
            gestureHooks.move(event, avalon.noop)
        },
        touchend: function (event) {
            var finger = rotateGesture.finger
            var endAngel = parseInt(getAngle180(rotateGesture.center, finger.lastTouch), 10)
            var diff = rotateGesture.startAngel - endAngel
            var count = 0;
            var __rotation = ~~finger.element.__rotation
            while (Math.abs(diff - __rotation) > 90 && count++ < 50) {
                if (__rotation < 0) {
                    diff -= 180;
                } else {
                    diff += 180;
                }
            }
            var rotation = finger.element.__rotation = __rotation = parseInt(diff, 10);
            rotateGesture.endAngel = parseInt(getAngle180(rotateGesture.center, rotateGesture.finger.lastTouch), 10)
            var extra = {
                touch: event.changedTouches[0],
                touchEvent: event,
                rotation: rotation,
                direction: (rotation > 0 ? 'right' : 'left')
            }
            gestureHooks.fire(finger.element, 'rotate', extra)
            gestureHooks.fire(finger.element, 'rotate'+extra.direction, extra)
            gestureHooks.end(event, avalon.noop)
        }
    }

    rotateGesture.touchcancel = rotateGesture.touchend

    gestureHooks.add('rotate', rotateGesture)
    return avalon
})