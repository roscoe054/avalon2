var ua = navigator.userAgent.toLowerCase()
//http://stackoverflow.com/questions/9038625/detect-if-device-is-ios
function iOSversion() {
    if (/iPad|iPhone|iPod/i.test(ua) && !window.MSStream) {
        if (!!window.indexedDB) {
            return 8;
        }
        if (!!window.SpeechSynthesisUtterance) {
            return 7;
        }
        if (!!window.webkitAudioContext) {
            return 6;
        }
        if (!!window.matchMedia) {
            return 5;
        }
        if (!!window.history && 'pushState' in window.history) {
            return 4;
        }
        return 3;
    }
    return NaN;
}

var deviceIsAndroid = ua.indexOf('android') > 0
var deviceIsIOS = iOSversion()
var gestureHooks = avalon.gestureHooks = {
    pointers: {},
    start: function (event, callback) {
        //touches是当前屏幕上所有触摸点的列表;
        //targetTouches是当前对象上所有触摸点的列表;
        //changedTouches是涉及当前事件的触摸点的列表。
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i]
            var gesture = {
                startTouch: mixTouchAttr({}, touch),
                startTime: Date.now(),
                status: 'tapping',
                element: event.target
            }
            gestureHooks.pointers[touch.identifier] = gesture;
            callback(gesture, event)

        }
    },
    move: function (event, callback) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i],
                    gesture = gestureHooks.pointers[touch.identifier];
            if (!gesture) {
                return;
            }
            if (typeof gesture._movestart === 'boolean') {
                gesture._movestart = !!gesture._movestart
            }

            if (!gesture.lastTouch) {
                gesture.lastTouch = gesture.startTouch
            }
            if (!gesture.lastTime) {
                gesture.lastTime = gesture.startTime
            }

            if (!gesture.duration) {
                gesture.duration = 0
            }

            var time = Date.now() - gesture.lastTime

            if (time > 0) {

                var RECORD_DURATION = 70
                if (time > RECORD_DURATION) {
                    time = RECORD_DURATION
                }
                if (gesture.duration + time > RECORD_DURATION) {
                    gesture.duration = RECORD_DURATION - time
                }


                gesture.duration += time;
                gesture.lastTouch = mixTouchAttr({}, touch)

                gesture.lastTime = Date.now()

                var displacementX = touch.clientX - gesture.startTouch.clientX
                var displacementY = touch.clientY - gesture.startTouch.clientY
                gesture.distance = Math.sqrt(Math.pow(displacementX, 2) + Math.pow(displacementY, 2));
                gesture.isVertical = !(Math.abs(displacementX) > Math.abs(displacementY))

                callback(gesture, touch)
            }
        }
    },
    end: function (event, callback) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i],
                    id = touch.identifier,
                    gesture = gestureHooks.pointers[id]

            if (!gesture)
                continue

            callback(gesture, touch)

            delete gestureHooks.pointers[id]
        }
    },
    fire: function (elem, type, props) {
        if (elem) {
            var event = document.createEvent('Events')
            event.initEvent(type, true, true)
            avalon.mix(event, props)
            elem.dispatchEvent(event)
        }
    },
    add: function (name, gesture) {
        function move(event) {
            gesture.touchmove(event)
        }

        function end(event) {
            gesture.touchend(event)

            document.removeEventListener("touchmove", move, false)

            document.removeEventListener("touchend", end, false)

            document.removeEventListener("touchcancel", cancel, false)

        }

        function cancel(event) {
            gesture.touchcancel(event)

            document.removeEventListener("touchmove", move, false)

            document.removeEventListener("touchend", end, false)

            document.removeEventListener("touchcancel", cancel, false)

        }

        gesture.events.forEach(function (eventName) {
            avalon.eventHooks[eventName] = {
                fn: function (el, fn) {
                    if (!el.getAttribute("data-" + name)) {
                        el.setAttribute("data-" + name, "1")
                        el.addEventListener("touchstart", function (event) {
                            gesture.touchstart(event)

                            document.addEventListener("touchmove", move, false)

                            document.addEventListener("touchend", end, false)

                            document.addEventListener("touchcancel", cancel, false)

                        }, false)
                    }
                    return fn
                }
            }
        })
    }
}



var touchkeys = ['screenX', 'screenY', 'clientX', 'clientY', 'pageX', 'pageY']

// 复制 touch 对象上的有用属性到固定对象上
function mixTouchAttr(target, source) {
    if (source) {
        touchkeys.forEach(function (key) {
            target[key] = source[key]
        })
    }
    return target
}


