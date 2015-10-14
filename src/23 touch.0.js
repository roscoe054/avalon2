var ua = navigator.userAgent.toLowerCase()
//http://stackoverflow.com/questions/9038625/detect-if-device-is-ios
function iOSversion() {
    //https://developer.apple.com/library/prerelease/mac/releasenotes/General/WhatsNewInSafari/Articles/Safari_9.html
    //http://mp.weixin.qq.com/s?__biz=MzA3MDQ4MzQzMg==&mid=256900619&idx=1&sn=b29f84cff0b8d7b9742e5d8b3cd8f218&scene=1&srcid=1009F9l4gh9nZ7rcQJEhmf7Q#rd
    if (/iPad|iPhone|iPod/i.test(ua) && !window.MSStream) {
        if ("backdropFilter" in document.documentElement.style) {
            return 9
        }
        if (!!window.indexedDB) {
            return 8
        }
        if (!!window.SpeechSynthesisUtterance) {
            return 7
        }
        if (!!window.webkitAudioContext) {
            return 6
        }
        if (!!window.matchMedia) {
            return 5
        }
        if (!!window.history && 'pushState' in window.history) {
            return 4
        }
        return 3
    }
    return NaN
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
            var pointer = {
                startTouch: mixTouchAttr({}, touch),
                startTime: Date.now(),
                status: 'tapping',
                element: event.target
            }
            gestureHooks.pointers[touch.identifier] = pointer;
            callback(pointer, touch)

        }
    },
    move: function (event, callback) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i]
            var pointer = gestureHooks.pointers[touch.identifier]
            if (!pointer) {
                return
            }

            if (!("lastTouch" in pointer)) {
                pointer.lastTouch = pointer.startTouch
                pointer.lastTime = pointer.startTime
                pointer.deltaX = pointer.deltaY = pointer.duration =  pointer.distance = 0
            }
           
            var time = Date.now() - pointer.lastTime

            if (time > 0) {

                var RECORD_DURATION = 70
                if (time > RECORD_DURATION) {
                    time = RECORD_DURATION
                }
                if (pointer.duration + time > RECORD_DURATION) {
                    pointer.duration = RECORD_DURATION - time
                }


                pointer.duration += time;
                pointer.lastTouch = mixTouchAttr({}, touch)

                pointer.lastTime = Date.now()

                pointer.deltaX = touch.clientX - pointer.startTouch.clientX
                pointer.deltaY = touch.clientY - pointer.startTouch.clientY
                var x = pointer.deltaX * pointer.deltaX
                var y = pointer.deltaY * pointer.deltaY
                pointer.distance = Math.sqrt(x + y)
                pointer.isVertical = x < y

                callback(pointer, touch)
            }
        }
    },
    end: function (event, callback) {
        for (var i = 0; i < event.changedTouches.length; i++) {
            var touch = event.changedTouches[i],
                    id = touch.identifier,
                    pointer = gestureHooks.pointers[id]

            if (!pointer)
                continue

            callback(pointer, touch)

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

            document.removeEventListener('touchmove', move)

            document.removeEventListener('touchend', end)

            document.removeEventListener('touchcancel', cancel)

        }

        function cancel(event) {
            gesture.touchcancel(event)

            document.removeEventListener('touchmove', move)

            document.removeEventListener('touchend', end)

            document.removeEventListener('touchcancel', cancel)

        }

        gesture.events.forEach(function (eventName) {
            avalon.eventHooks[eventName] = {
                fn: function (el, fn) {
                    if (!el['touch-' + name]) {
                        el['touch-' + name] = '1'
                        el.addEventListener('touchstart', function (event) {
                            gesture.touchstart(event)

                            document.addEventListener('touchmove', move)

                            document.addEventListener('touchend', end)

                            document.addEventListener('touchcancel', cancel)

                        })
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


  