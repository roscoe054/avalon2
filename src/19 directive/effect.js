avalon.directive("effect", {
    priority: 5,
    init: function (binding) {
        var text = binding.expr,
                className,
                rightExpr
        var colonIndex = text.replace(rexprg, function (a) {
            return a.replace(/./g, "0")
        }).indexOf(":") //取得第一个冒号的位置
        if (colonIndex === -1) { // 比如 ms-class/effect="aaa bbb ccc" 的情况
            className = text
            rightExpr = true
        } else { // 比如 ms-class/effect-1="ui-state-active:checked" 的情况
            className = text.slice(0, colonIndex)
            rightExpr = text.slice(colonIndex + 1)
        }
        if (!rexpr.test(text)) {
            className = JSON.stringify(className)
        } else {
            className = stringifyExpr(className)
        }
        binding.expr = "[" + className + "," + rightExpr + "]"
    },
    update: function (arr) {
        var name = arr[0]
        var elem = this.element
        if (elem.getAttribute("data-effect-name") === name) {
            return
        } else {
            elem.removeAttribute("data-effect-driver")
        }
        var inlineStyles = elem.style
        var computedStyles = window.getComputedStyle ? window.getComputedStyle(elem) : null
        var useAni = false
        if (computedStyles && (supportTransition || supportAnimation)) {

            //如果支持CSS动画
            var duration = inlineStyles[transitionDuration] || computedStyles[transitionDuration]
            if (duration && duration !== '0s') {
                elem.setAttribute("data-effect-driver", "t")
                useAni = true
            }

            if (!useAni) {

                duration = inlineStyles[animationDuration] || computedStyles[animationDuration]
                if (duration && duration !== '0s') {
                    elem.setAttribute("data-effect-driver", "a")
                    useAni = true
                }

            }
        }

        if (!useAni) {
            if (avalon.effects[name]) {
                elem.setAttribute("data-effect-driver", "j")
                useAni = true
            }
        }
        if (useAni) {
            elem.setAttribute("data-effect-name", name)
        }
    }
})

avalon.effects = {}
avalon.effect = function (name, callbacks) {
    avalon.effects[name] = callbacks
}



var supportTransition = false
var supportAnimation = false

var transitionEndEvent
var animationEndEvent
var transitionDuration = avalon.cssName("transition-duration")
var animationDuration = avalon.cssName("animation-duration")
new function () {// jshint ignore:line
    var checker = {
        'TransitionEvent': 'transitionend',
        'WebKitTransitionEvent': 'webkitTransitionEnd',
        'OTransitionEvent': 'oTransitionEnd',
        'otransitionEvent': 'otransitionEnd'
    }
    var tran
    //有的浏览器同时支持私有实现与标准写法，比如webkit支持前两种，Opera支持1、3、4
    for (var name in checker) {
        if (window[name]) {
            tran = checker[name]
            break;
        }
        try {
            var a = document.createEvent(name);
            tran = checker[name]
            break;
        } catch (e) {
        }
    }
    if (typeof tran === "string") {
        supportTransition = true
        transitionEndEvent = tran
    }

    //大致上有两种选择
    //IE10+, Firefox 16+ & Opera 12.1+: animationend
    //Chrome/Safari: webkitAnimationEnd
    //http://blogs.msdn.com/b/davrous/archive/2011/12/06/introduction-to-css3-animat ions.aspx
    //IE10也可以使用MSAnimationEnd监听，但是回调里的事件 type依然为animationend
    //  el.addEventListener("MSAnimationEnd", function(e) {
    //     alert(e.type)// animationend！！！
    // })
    checker = {
        'AnimationEvent': 'animationend',
        'WebKitAnimationEvent': 'webkitAnimationEnd'
    }
    var ani;
    for (name in checker) {
        if (window[name]) {
            ani = checker[name];
            break;
        }
    }
    if (typeof ani === "string") {
        supportTransition = true
        animationEndEvent = ani
    }

}()

var effectPool = []//重复利用动画实例
function effectFactory(el, opts) {
    if (!el || el.nodeType !== 1) {
        return null
    }
    if (opts) {
        var name = opts.effectName
        var driver = opts.effectDriver
    } else {
        name = el.getAttribute("data-effect-name")
        driver = el.getAttribute("data-effect-driver")
    }
    if (!name || !driver) {
        return null
    }

    var instance = effectPool.pop() || new Effect()
    instance.el = el
    instance.driver = driver
    instance.useCss = driver !== "j"
    instance.name = name
    instance.callbacks = avalon.effects[name] || {}

    return instance


}

function effectBinding(elem, binding) {
    binding.effectName = elem.getAttribute("data-effect-name")
    binding.effectDriver = elem.getAttribute("data-effect-driver")
    var stagger = +elem.getAttribute("data-effect-stagger")
    binding.effectLeaveStagger = +elem.getAttribute("data-effect-leave-stagger") || stagger
    binding.effectEnterStagger = +elem.getAttribute("data-effect-enter-stagger") || stagger
    binding.effectClass = elem.className || NaN
}
var effectBuffer = new Buffer()
function Effect() {
}// 动画实例,做成类的形式,是为了共用所有原型方法

Effect.prototype = {
    contrustor: Effect,
    enterClass: function () {
        return getEffectClass(this, "enter")
    },
    leaveClass: function () {
        return getEffectClass(this, "leave")
    },
    actionFun: function(name, before, after) {
        if (document.hidden) {
            return
        }
        var me = this
        var el = me.el
        callEffectHook(me, "beforeEnter")
        before(el) //  这里可能做插入DOM树的操作,因此必须在修改类名前执行

        if (me.useCss) {
            var curEnterClass = me.curEnterClass = me.enterClass()
            me.eventName = me.driver === "t" ? transitionEndEvent : animationEndEvent
            if (me.leaveCallback) {
                el.removeEventListener(me.eventName, me.leaveCallback)
                avalon(el).removeClass(me.curLeaveClass)
                me.leaveCallback = null
            }

            //注意,css动画的发生有几个必要条件
            //1.定义了时长,2.有要改变的样式,3.必须插入DOM树 4.display不能等于none
            //5.document.hide不能为true, 6transtion必须延迟一下才修改样式

            me.enterCallback = function () {
                el.removeEventListener(me.eventName, me.enterCallback)
                if (me.driver === "a") {
                    avalon(el).removeClass(curEnterClass)
                }
                callEffectHook(me, "afterEnter")
                after && after(el)
                me.dispose()
            }


            me.update = function () {
                el.addEventListener(me.eventName, me.enterCallback)
                if (me.driver === "t") {//transtion延迟触发
                    avalon(el).removeClass(curEnterClass)
                    console.log(new Date - 0)
                }

            }
            avalon(el).addClass(curEnterClass)//animation会立即触发
            console.log(new Date - 0, el.className)

            effectBuffer.render(true)
            effectBuffer.queue.push(me)

        } else {
            callEffectHook(this, "enter", function () {
                callEffectHook(me, "afterEnter")
                after && after(el)
                me.dispose()
            })
        }
    },
    enter: function (before, after) {
        if (document.hidden) {
            return
        }
        var me = this
        var el = me.el
        callEffectHook(me, "beforeEnter")
        before(el) //  这里可能做插入DOM树的操作,因此必须在修改类名前执行

        if (me.useCss) {
            var curEnterClass = me.curEnterClass = me.enterClass()
            me.eventName = me.driver === "t" ? transitionEndEvent : animationEndEvent
            if (me.leaveCallback) {
                el.removeEventListener(me.eventName, me.leaveCallback)
                avalon(el).removeClass(me.curLeaveClass)
                me.leaveCallback = null
            }

            //注意,css动画的发生有几个必要条件
            //1.定义了时长,2.有要改变的样式,3.必须插入DOM树 4.display不能等于none
            //5.document.hide不能为true, 6transtion必须延迟一下才修改样式

            me.enterCallback = function () {
                el.removeEventListener(me.eventName, me.enterCallback)
                if (me.driver === "a") {
                    avalon(el).removeClass(curEnterClass)
                }
                callEffectHook(me, "afterEnter")
                after && after(el)
                me.dispose()
            }


            me.update = function () {
                el.addEventListener(me.eventName, me.enterCallback)
                if (me.driver === "t") {//transtion延迟触发
                    avalon(el).removeClass(curEnterClass)
                    console.log(new Date - 0)
                }

            }
            avalon(el).addClass(curEnterClass)//animation会立即触发
            console.log(new Date - 0, el.className)

            effectBuffer.render(true)
            effectBuffer.queue.push(me)

        } else {
            callEffectHook(this, "enter", function () {
                callEffectHook(me, "afterEnter")
                after && after(el)
                me.dispose()
            })
        }
    },
    leave: function (before, after) {
        if (document.hidden) {
            return
        }

        var me = this
        var el = me.el
        callEffectHook(me, "beforeLeave")
        if (me.useCss) {
            var curLeaveClass = me.curLeaveClass = me.leaveClass()
            me.eventName = me.driver === "t" ? transitionEndEvent : animationEndEvent

            if (me.enterCallback) {
                el.removeEventListener(me.eventName, me.enterCallback)
                avalon(el).removeClass(me.curEnterClass)
                me.enterCallback = null
            }

            me.leaveCallback = function () {
                el.removeEventListener(me.eventName, me.leaveCallback)
                before(el) //这里可能做移出DOM树操作,因此必须位于动画之后
                avalon(el).removeClass(curLeaveClass)
                callEffectHook(me, "afterLeave")
                after && after(el)
                me.dispose()
            }
            this.update = function () {
                el.addEventListener(me.eventName, me.leaveCallback)
            }

            avalon(el).addClass(curLeaveClass)//animation立即触发
            effectBuffer.render(true)
            effectBuffer.queue.push(me)


        } else {
            callEffectHook(me, "leave", function () {
                before(el)
                callEffectHook(me, "afterLeave")
                after && after(el)
                me.dispose()
            })
        }

    },
    dispose: function () {//销毁与回收到池子中
        this.upate = this.el = this.driver = this.useCss = this.callbacks = null
        if (effectPool.unshift(this) > 100) {
            effectPool.pop()
        }
    }


}


function getEffectClass(instance, type) {
    var a = instance.callbacks[type + "Class"]
    if (typeof a === "string")
        return a
    if (typeof a === "function")
        return a()
    return instance.name + "-" + type
}


function callEffectHook(effect, name, cb) {
    var hook = effect.callbacks[name]
    if (hook) {
        hook.call(effect, effect.el, cb)
    }
}

var applyEffect = function (el, dir/*[before, [after, [opts]]]*/) {
    var args = aslice.call(arguments, 0)
    if (typeof args[2] !== "function") {
        args.splice(2, 0, noop)
    }
    if (typeof args[3] !== "function") {
        args.splice(3, 0, noop)
    }
    var before = args[2]
    var after = args[3]
    var opts = args[4]
    var effect = effectFactory(el, opts)
    if (!effect) {
        before()
        after()
        return false
    } else {
        var method = dir ? 'enter' : 'leave'
        effect[method](before, after)
    }
}

avalon.mix(avalon.effect, {
    apply: applyEffect,
    append: function (el, parent, after, opts) {
        return applyEffect(el, 1, function () {
            parent.appendChild(el)
        }, after, opts)
    },
    before: function (el, target, after, opts) {
        return applyEffect(el, 1, function () {
            target.parentNode.insertBefore(el, target)
        }, after, opts)
    },
    remove: function (el, parent, after, opts) {
        return applyEffect(el, 0, function () {
            if (el.parentNode === parent)
                parent.removeChild(el)
        }, after, opts)
    }
})

