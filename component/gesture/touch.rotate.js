define(['avalon'], function (avalon) {
    var gestureHooks = avalon.gestureHooks

    var rotateGesture = {
        events: ['rotate', 'rotateright', 'rotateleft'],
        getAngle180: function (p1, p2) {
            // 角度， 范围在{0-180}， 用来识别旋转角度
            var agl = Math.atan((p2.pageY - p1.pageY) * -1 / (p2.pageX - p1.pageX)) * (180 / Math.PI)
            return parseInt((agl < 0 ? (agl + 180) : agl), 10)
        },
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
            rotateGesture.startAngel = rotateGesture.getAngle180(rotateGesture.center, finger.startTouch)
        },
        rotate: function (event, status) {
            var finger = rotateGesture.finger
            var endAngel = rotateGesture.getAngle180(rotateGesture.center, finger.lastTouch)
            var diff = rotateGesture.startAngel - endAngel
            var direction =  (diff > 0 ? 'right' : 'left')
            var count = 0;
            var __rotation = ~~finger.element.__rotation
            while (Math.abs(diff - __rotation) > 90 && count++ < 50) {
                if (__rotation < 0) {
                    diff -= 180
                } else {
                    diff += 180
                }
            }
            var rotation = finger.element.__rotation = __rotation = diff
            rotateGesture.endAngel = endAngel
            var extra = {
                touch: event.changedTouches[0],
                touchEvent: event,
                rotation: rotation,
                direction: direction
            }
            if (status === "end") {
                gestureHooks.fire(finger.element, 'rotateend', extra)
                finger.element.__rotation = 0
            } else if (finger.status === 'tapping' && diff) {
                finger.status = "panning"
                gestureHooks.fire(finger.element, 'rotatestart', extra)
            } else {
                gestureHooks.fire(finger.element, 'rotate', extra)
            }
        },
        touchmove: function (event) {
            gestureHooks.move(event, avalon.noop)
            rotateGesture.rotate(event)
        },
        touchend: function (event) {
            rotateGesture.rotate(event, "end")
            gestureHooks.end(event, avalon.noop)
        }
    }

    rotateGesture.touchcancel = rotateGesture.touchend

    gestureHooks.add('rotate', rotateGesture)
    return avalon
})
//https://github.com/Clouda-team/touch.code.baidu.com/blob/master/touch-0.2.10.js