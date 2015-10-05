var fastClick = {
    trackingClick: false,
    trackingClickStart: 0,
    targetElement: null,
    touchStartX: 0,
    touchStartY: 0,
    touchBoundary: 10,
    tapDelay: 200,
    sendClick: function (targetElement, event) {
        // 在click之前触发tap事件
        gestureHooks.fire(targetElement, 'tap', {
            fastclick: true
        })
        var clickEvent, touch

        // On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
        if (document.activeElement && document.activeElement !== targetElement) {
            document.activeElement.blur()
        }

        touch = event.changedTouches[0]

        // Synthesise a click event, with an extra attribute so it can be tracked
        clickEvent = document.createEvent('MouseEvents')
        clickEvent.initMouseEvent('click', true, true, window, 1, touch.screenX,
                touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        clickEvent.fastclick = true;
        targetElement.dispatchEvent(clickEvent)
    },
    needClick: function (target) {
        switch (target.nodeName.toLowerCase()) {

            // Don't send a synthetic click to disabled inputs (issue #62)
            case 'button':
            case 'select':
            case 'textarea':
                if (target.disabled) {
                    return true
                }

                break;
            case 'input':

                // File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
                if ((deviceIsIOS && target.type === 'file') || target.disabled) {
                    return true
                }

                break;
            case 'label':
            case 'iframe':
            case 'video':
                return true
        }

        return false
    },
    focus: function (targetElement) {
        var length;

        // on iOS 7, some input elements (e.g. date datetime) throw a vague TypeError on setSelectionRange. These elements don't have an integer value for the selectionStart and selectionEnd properties, but unfortunately that can't be used for detection because accessing the properties also throws a TypeError. Just check the type instead. Filed as Apple bug #15122724.
        if (deviceIsIOS && targetElement.setSelectionRange &&
                targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time') {
            length = targetElement.value.length
            targetElement.setSelectionRange(length, length)
        } else {
            targetElement.focus()
        }
    },
    needFocus: function (target) {
        switch (target.nodeName.toLowerCase()) {
            case 'textarea':
            case 'select': //实测android下select也需要
                return true;
            case 'input':
                switch (target.type) {
                    case 'button':
                    case 'checkbox':
                    case 'file':
                    case 'image':
                    case 'radio':
                    case 'submit':
                        return false
                }

                // No point in attempting to focus disabled inputs
                return !target.disabled && !target.readOnly
            default:
                return false
        }
    },
    updateScrollParent: function (targetElement) {

        var scrollParent = targetElement.fastClickScrollParent

        // Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
        // target element was moved to another parent.
        if (!scrollParent || !scrollParent.contains(targetElement)) {
            var parentElement = targetElement;
            do {
                if (parentElement.scrollHeight > parentElement.offsetHeight) {
                    scrollParent = parentElement;
                    targetElement.fastClickScrollParent = parentElement
                    break;
                }

                parentElement = parentElement.parentElement
            } while (parentElement);
        }

        // Always update the scroll top tracker if possible.
        if (scrollParent) {
            scrollParent.fastClickLastScrollTop = scrollParent.scrollTop
        }
    },
    findControl: function (labelElement) {
        // Fast path for newer browsers supporting the HTML5 control attribute
        if (labelElement.control !== undefined) {
            return labelElement.control
        }

        // All browsers under test that support touch events also support the HTML5 htmlFor attribute
        if (labelElement.htmlFor) {
            return document.getElementById(labelElement.htmlFor)
        }

        // If no for attribute exists, attempt to retrieve the first labellable descendant element
        // the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
        return labelElement.querySelector('button, input:not([type=hidden]), keygen,' +
                'meter, output, progress, select, textarea')
    },
    touchHasMoved: function (event) {
        var touch = event.changedTouches[0],
                boundary = fastClick.touchBoundary

        if (Math.abs(touch.pageX - fastClick.touchStartX) > boundary ||
                Math.abs(touch.pageY - fastClick.touchStartY) > boundary) {
            return true
        }

        return false
    },
    fixTarget: function (target) {
        if (window.SVGElementInstance && (target instanceof SVGElementInstance)) {
            target = target.correspondingUseElement;
        }

        return target
    }
}
supportPointer = !!navigator.pointerEnabled || !!navigator.msPointerEnabled

if (supportPointer) { // 支持pointer的设备可用样式来取消click事件的300毫秒延迟
    root.style.msTouchAction = root.style.touchAction = "none"
}
gestureHooks.add("tap", {
    events: ['tap', 'click'],
    touchstart: function (event) {
        var targetElement, touch, selection;

        // Ignore multiple touches, otherwise pinch-to-zoom is prevented if both fingers are on the fastClick element (issue #111).
        if (event.targetTouches.length > 1) {
            return true
        }

        targetElement = fastClick.fixTarget(event.target);
        touch = event.targetTouches[0];

        if (deviceIsIOS) {

            // Only trusted events will deselect text on iOS (issue #49)
            selection = window.getSelection();
            if (selection.rangeCount && !selection.isCollapsed) {
                return true
            }

            fastClick.updateScrollParent(targetElement);
        }

        fastClick.trackingClick = true
        fastClick.trackingClickStart = event.timeStamp
        fastClick.targetElement = targetElement


        fastClick.touchStartX = touch.pageX
        fastClick.touchStartY = touch.pageY

        // Prevent phantom clicks on fast double-tap (issue #36)
        if ((event.timeStamp - fastClick.lastClickTime) < fastClick.tapDelay) {
            event.preventDefault()
        }

        return true
    },
    touchmove: function (event) {
        if (!fastClick.trackingClick) {
            return true
        }

        // If the touch has moved, cancel the click tracking
        if (fastClick.targetElement !== fastClick.fixTarget(event.target) ||
                fastClick.touchHasMoved(event)) {
            fastClick.trackingClick = false
            fastClick.targetElement = null
        }

    },
    touchend: function (event) {
        var forElement, trackingClickStart, targetTagName, scrollParent,
                targetElement = fastClick.targetElement;

        if (event.timeStamp - fastClick.trackingClickStart > fastClick.tapDelay || !fastClick.trackingClick) {
            return true;
        }

        // Prevent phantom clicks on fast double-tap (issue #36)
        if ((event.timeStamp - fastClick.lastClickTime) < fastClick.tapDelay) {
            fastClick.cancelNextClick = true;
            return true;
        }

        // Reset to prevent wrong click cancel on input (issue #156).
        fastClick.cancelNextClick = false;

        fastClick.lastClickTime = event.timeStamp;

        trackingClickStart = fastClick.trackingClickStart;
        fastClick.trackingClick = false
        fastClick.trackingClickStart = 0

        targetTagName = targetElement.tagName.toLowerCase()
        if (targetTagName === 'label') {
            forElement = fastClick.findControl(targetElement)
            if (forElement) {
                fastClick.focus(targetElement)
                if (deviceIsAndroid) {
                    return false
                }

                targetElement = forElement
            }
        } else if (fastClick.needFocus(targetElement)) {

            // Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
            // Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
            if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
                fastClick.targetElement = null
                return false;
            }

            fastClick.focus(targetElement)
            deviceIsAndroid && fastClick.sendClick(targetElement, event)

            return false;
        }

        if (deviceIsIOS) {

            // Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
            // and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
            scrollParent = targetElement.fastClickScrollParent;
            if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
                return true
            }
        }

        // Prevent the actual click from going though - unless the target node is marked as requiring
        // real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
        if (!fastClick.needClick(targetElement)) {
            event.preventDefault();
            fastClick.sendClick(targetElement, event)
        }

        return false;
    },
    touchcancel: function () {
        fastClick.trackingClick = false
        fastClick.targetElement = null
    }
})
