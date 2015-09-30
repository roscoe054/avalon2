new function () {// jshint ignore:line
    var me = onDir
    var sniff = {}
    var ua = navigator.userAgent
    var platform = navigator.platform
    var android = ua.match(/(Android);?[\s\/]+([\d.]+)?/) // 匹配 android
    var ipad = ua.match(/(iPad).*OS\s([\d_]+)/) // 匹配 ipad
    var ipod = ua.match(/(iPod)(?:.*OS\s([\d_]+))?/) // 匹配 ipod
    var iphone = ua.match(/(iPhone\sOS)\s([\d_]+)/)  // 匹配 iphone
    if (android) {
        sniff.version = android[2]
        sniff.android = true
    }

    var iversion = ipad || iphone || ipod
    if (iversion) {
        sniff.version = String(iversion[2]).replace(/_/g, '.');
        sniff.ios = true
        if (ua.indexOf('Version/') >= 0) {
            sniff.version = ua.toLowerCase().split('version/')[1].split(' ')[0];
        }
        sniff.versionN = parseInt(sniff.version, 10)
    }
    sniff.pc = platform.indexOf('Mac') === 0 || platform.indexOf('Win') === 0 ||
            (platform.indexOf('linux') === 0 && !sniff.android)

    // avalon在移动端提供两组 tap系 与 swipe系
    // tap相当于PC端的click,包括tap, doubletap, longtap(500)
    // swipe是划动,移动距离超过10, 大于0.65px/ms的速度才可以触发
    var TOUCHKEYS = [
        'screenX', 'screenY', 'clientX', 'clientY', 'pageX', 'pageY'
    ]
    // 普通的点击 200, 长按500

    var gesture,
            curElement,
            curId,
            lastId,
            lastTime = 0,
            trackingClick,
            clickElement,
            overTouchTime = 0,
            cancelNextClick = false,
            running = true;

    // 重置
    function reset() {
        gesture = curElement = curId = null;
    }

    // 复制 touch 对象上的有用属性到固定对象上
    function mixTouchAttr(target, source) {
        if (source) {
            TOUCHKEYS.forEach(function (key) {
                target[key] = source[key];
            });
        }
        return target;
    }

    // 检测是否需要原生 click
    function needsClick(target) {
        switch (target.nodeName.toLowerCase()) {
            case 'button':
            case 'select':
            case 'textarea':
                if (target.disabled) {
                    return true;
                }
                break;
            case 'input':
                // IOS6 pad 上选择文件，如果不是原生的click，弹出的选择界面尺寸错误
                if ((ipad && sniff.versionN === 6 && target.type === 'file') || target.disabled) {
                    return true;
                }
                break;
            case 'label':
            case 'iframe':
            case 'video':
                return true;
        }

        return (/\bneedsclick\b/).test(target.className);
    }

    // 检测是否需要 focus
    function needsFocus(target) {
        switch (target.nodeName.toLowerCase()) {
            case 'textarea':
                return true;
            case 'select':
                return !sniff.android;
            case 'input':
                switch (target.type) {
                    case 'button':
                    case 'checkbox':
                    case 'file':
                    case 'image':
                    case 'radio':
                    case 'submit':
                        return false;
                }
                return !target.disabled && !target.readOnly;
            default:
                return (/\bneedsfocus\b/).test(target.className);
        }
    }

    // 选择触发的事件
    function determineEventType(target) {
        // 安卓chrome浏览器上，模拟的 click 事件不能让 select 打开，故使用 mousedown 事件
        if (sniff.android && target.nodeName.toLowerCase() === 'select') {
            return 'mousedown'
        }

        return 'click'
    }

    // 发送 click 事件
    function sendClick(target, touch) {
        var clickEvent;

        // 某些安卓设备必须先移除焦点，之后模拟的click事件才能让新元素获取焦点
        if (document.activeElement && document.activeElement !== target) {
            document.activeElement.blur();
        }

        clickEvent = document.createEvent('MouseEvents')
        clickEvent.initMouseEvent(determineEventType(target), true, true, window, 1, touch.screenX,
                touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        clickEvent.forwardedTouchEvent = true;
        if (running) {
            target.dispatchEvent(clickEvent);
        }
    }

    //  寻找 label 对应的元素
    function findControl(labelElement) {

        // HTML5 新属性
        if (labelElement.control !== undefined) {
            return labelElement.control;
        }

        // 通过 htmlFor
        if (labelElement.htmlFor) {
            return document.getElementById(labelElement.htmlFor);
        }

        return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter,' +
                'output, progress, select, textarea');
    }

    function findTouch(touches) {
        for (var i = 0, el; el = touches[i++]; ) {
            if (el.identifier === curId) {
                return el
            }
        }
    }

    // 创建事件
    function createEvent(type) {
        var event = document.createEvent('HTMLEvents')
        event.initEvent(type, true, true)
        return event
    }

    // 分析 Move
    function analysisMove(event, touch) {
        var startTouch = gesture.origin
        var offsetX = touch.clientX - startTouch.clientX
        var offsetY = touch.clientY - startTouch.clientY
        if (gesture.status === 'tapping') {
            if (swipeDistance(offsetX, offsetY) > 10) {//如果发生移动, 那么事件改成
                gesture.status = 'swipering' // 更改状态
                trackingClick = clickElement = null;
                gesture.startMoveTime = event.timeStamp // 记录移动开始的时间
                clearTimeout(gesture.handler)
                gesture.handler = null
            }
        }
    }
    // 判定滑动方向
    function swipeDirection(offsetX, offsetY) {
        return Math.abs(offsetX) >=
                Math.abs(offsetY) ? (offsetX < 0 ? 'left' : 'right') : (offsetY < 0 ? 'up' : 'down')
    }
    // 计算滑动距离
    function swipeDistance(offsetX, offsetY) {
        return Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2))
    }
    // 分析 End
    var doubleCount = 0
    var doubleTime = 0
    function analysisEnd(event, touch) {
        if (gesture.handler) {
            clearTimeout(gesture.handler)
            gesture.handler = null
        }
        if (gesture.status === 'swipering') {//平移
            var startTouch = gesture.origin,
                    offsetX = touch.clientX - startTouch.clientX,
                    offsetY = touch.clientY - startTouch.clientY,
                    duration = event.timeStamp - gesture.startMoveTime;
            var distance = swipeDistance(offsetX, offsetY)
            if (distance > 100 && distance / duration > 0.65) {
                var direction = swipeDirection(offsetX, offsetY)

                var swipeEvent = mixTouchAttr(createEvent('swipe'), touch)
                swipeEvent.direction = direction
                trigger(swipeEvent)
                trigger(mixTouchAttr(createEvent('swipe' + direction), touch))
            }
        } else {
            if (gesture.status === 'tapping') {
                trigger(mixTouchAttr(createEvent('tap'), touch))
                doubleCount++
                var now = new Date - 0
                if (doubleCount === 2) {
                    doubleTime = now
                    doubleCount = 0
                    if (now - doubleTime < 250) {
                        event.preventDefault()
                        trigger(mixTouchAttr(createEvent('doubletap'), touch))
                    }
                }
            }
        }
    }

    // 触发事件
    function trigger(event) {
        if (running && curElement) {
            curElement.dispatchEvent(event);
        }
    }
    function onTouchStart(event) {

        var touch, selection,
                changedTouches = event.changedTouches,
                timestamp = event.timeStamp;

        // 如果两次 touch 事件过快，则，直接阻止默认行为
        if (timestamp - lastTime < 200) {
            event.preventDefault()
            return false
        }

        // 忽略多指操作
        if (changedTouches.length > 1) {
            return true
        } else if (curId) {
            // 防抱死，由于快速点击时，有时touchend事件没有触发，造成手势库卡死
            overTouchTime++
            if (overTouchTime > 3) {
                reset()
            }
            return true;
        }

        touch = changedTouches[0]
        if (touch) {
            curElement = event.target
            curId = touch.identifier
            gesture = {
                origin: mixTouchAttr({}, touch), //保持原有的位置
                timestamp: timestamp,
                status: 'tapping',
                handler: setTimeout(function () {
                    var event = mixTouchAttr(createEvent('longtap'), gesture.origin)
                    event.duration = new Date - timestamp //长按
                    trigger(event)
                    clearTimeout(gesture.handler)
                    gesture.handler = null
                }, 500)
            };

            if (!sniff.pc) {
                // 排除 ios 上的一些特殊情况
                if (sniff.ios) {
                    // 判断是否是点击文字，进行选择等操作，如果是，不需要模拟click
                    selection = window.getSelection()
                    if (selection.rangeCount && !selection.isCollapsed) {
                        return true
                    }
                    // 当 alert 或 confirm 时，点击其他地方，会触发touch事件，id相同，此事件应该被忽略
                    if (curId === lastId) {
                        event.preventDefault()
                        return false
                    }

                    lastId = curId
                }

                // 开始跟踪 click
                trackingClick = true;
                clickElement = curElement
            }

        }
        overTouchTime = 0
    }


    function onTouchMove(event) {
        var touch = findTouch(event.changedTouches)
        if (touch && gesture) {
            analysisMove(event, touch)
        }
    }

    function onFocus(element) {
        var length;
        // 兼容 ios7 问题
        if (sniff.ios && element.setSelectionRange &&
                element.type.indexOf('date') !== 0 &&
                element.type !== 'time' && element.type !== 'month') {
            length = element.value.length
            element.setSelectionRange(length, length)
        } else {
            element.focus()
        }
    }

    function onTouchEnd(event) {
        var touch = findTouch(event.changedTouches),
                timestamp = event.timeStamp,
                tagName, forElement

        if (touch && gesture) {
            analysisEnd(event, touch);

            var startTime = gesture.timestamp;

            reset()

            if (trackingClick) {

                // 触击过快，阻止下一次 click
                // 这次的touchstart - 上次的touchstart
                if (timestamp - lastTime < 200) {
                    cancelNextClick = true;
                    return true
                }
                //太长了
                if (timestamp - startTime > 200) {
                    return true
                }

                cancelNextClick = false
                lastTime = timestamp

                tagName = clickElement.nodeName.toLowerCase();
                // 如果是 label， 则模拟 focus 其相关的元素
                if (tagName === 'label') {
                    forElement = findControl(clickElement);
                    if (forElement) {
                        onFocus(forElement)

                        if (android) {
                            return false;
                        }

                        clickElement = forElement
                    }
                } else if (needsFocus(clickElement)) {
                    if (timestamp - startTime > 100 ||
                            (sniff.ios && window.top !== window && tagName === 'input')) {
                        clickElement = null
                        return false
                    }

                    onFocus(clickElement)
                    sendClick(clickElement, touch)

                    if (!sniff.ios || tagName !== 'select') {
                        clickElement = null
                        event.preventDefault()
                    }

                    return false
                }

                if (!needsClick(clickElement)) {
                    event.preventDefault()
                    sendClick(clickElement, touch)
                }

            }
        }
    }


    function onTouchCancel(event) {
        var touch = findTouch(event.changedTouches)

        if (touch && gesture) {
            clickElement = null
            analysisEnd(event, touch)
            reset()
        }
    }

    function onMouse(event) {
        if (!clickElement) {
            return true
        }

        if (event.forwardedTouchEvent) {
            return true
        }

        if (!event.cancelable) {
            return true
        }

        if (!needsClick(clickElement) || cancelNextClick) {
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation()
            } else {
                event.propagationStopped = true
            }
            event.stopPropagation()
            event.preventDefault()
            return false
        }

        return true
    }
    function onClick(event) {
        var permitted;

        if (trackingClick) {
            clickElement = trackingClick = null;
            return true;
        }

        if (event.target.type === 'submit' && event.detail === 0) {
            return true;
        }

        permitted = onMouse(event);

        if (!permitted) {
            clickElement = null;
        }

        return permitted;
    }

    avalon.ready(function () {
        var body = DOC.body

        if (!sniff.pc) {
            if (android) {
                avalon.bind(body, 'moveover', onMouse, true)
                avalon.bind(body, 'mousedown', onMouse, true)
                avalon.bind(body, 'mouseup', onMouse, true)
            }

            avalon.bind(body, 'click', onClick, true)
        }

        avalon.bind(body, 'touchstart', onTouchStart, true)
        avalon.bind(body, 'touchmove', onTouchMove, true)
        avalon.bind(body, 'touchend', onTouchEnd, true)
        avalon.bind(body, 'touchcancel', onTouchCancel, true)
    });

    ["swipe", "swipeleft", "swiperight", "swipeup", "swipedown", "doubletap", "tap", "longtap"].forEach(function (method) {
        me[method + "Hook"] = me["clickHook"]
    })

    //各种摸屏事件的示意图 http://quojs.tapquo.com/  http://touch.code.baidu.com/
}// jshint ignore:line