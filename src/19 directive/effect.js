avalon.directive("effect", {
    priority: 5,
    init: function (binding) {
        var text = binding.expr,
                className,
                rightExpr
        var colonIndex = text.replace(rexprg, function (a) {
            return a.replace(/./g, "0")
        }).indexOf(":") //取得第一个冒号的位置
        if (colonIndex === -1) { // 比如 ms-class="aaa bbb ccc" 的情况
            className = text
            rightExpr = true
        } else { // 比如 ms-class-1="ui-state-active:checked" 的情况
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
new function () {
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
    for (var name in checker) {
        if (window[name]) {
            ani = checker[name];
            break;
        }
    }
    if (typeof ani === "string") {
        supportTransition = true
        animationEndEvent = ani
    }

}




var effectPool = []
function effectFactory(el) {
    if (!el || el.nodeType !== 1 || !el.getAttribute("data-effect-name")) {
        return null
    }
    var name = el.getAttribute("data-effect-name")
    var driver = el.getAttribute("data-effect-driver")
    var instance = effectPool.pop() || new Effect()
    instance.el = el
    instance.driver = driver
    instance.useCss = driver !== "j"
    instance.name = name
    instance.callbacks = avalon.effects[name] || {}
    //   instance.enterClass = name + "-enter"
    //  instance.leaveClass = name + "-leave"


    return instance


}
function Effect() {// 动画是一组组存放的

}

Effect.prototype = {
    contrustor: Effect,
    enterClass: function () {
        return getEffectClass(this, "enter")
    },
    leaveClass: function () {
        return getEffectClass(this, "leave")
    },
    enter: function (before, after) {
        var me = this
        var el = this.el
        callEffectHook(me, "beforeEnter")
        before(el)
        if (this.useCss) {
            var curEnterClass = me.enterClass()
            //注意,css动画的发生有几个必要条件
            //1.定义了时长,2.有要改变的样式,3.必须插入DOM树 4.display不能等于none
            //5.document.hide不能为true, 6必须延迟一下才修改样式
            this.update = function () {

                var eventName = this.driver === "t" ? transitionEndEvent : animationEndEvent
                avalon(el).removeClass(curEnterClass)
                el.addEventListener(eventName, function fn() {
                    el.removeEventListener(eventName, fn)
                    callEffectHook(me, "afterEnter")
                    after(el)
                })
            }

            avalon(el).addClass(curEnterClass)
            buffer.render(true)
            buffer.queue.push(this)

        } else {

            callEffectHook(this, "enter", function () {

                callEffectHook(me, "afterEnter")
                after(el)
            })
        }
    },
    leave: function (before, after) {
        var el = this.el
        var me = this
        callEffectHook(me, "beforeLeave")
        if (this.useCss) {
            var eventName = this.driver === "t" ? transitionEndEvent : animationEndEvent
            el.addEventListener(eventName, function fn() {
                el.removeEventListener(eventName, fn)

                avalon(el).removeClass(curLeaveClass)
                console.log(curLeaveClass)
                callEffectHook(me, "afterLeave")
                after(el)
            })
            before(el)
            var curLeaveClass = me.leaveClass()
            avalon(el).addClass(curLeaveClass)
        } else {
            callEffectHook(me, "leave", function () {
                before(el)

                callEffectHook(me, "afterLeave")
                after(el)
            })

        }

        //console.log("sssss")
    }
}

function animateImpl(effect, type, before, after) {
    if (document.hidden === false) {

        var el = effect.el
        callEffectHook(effect, camelize("before-" + type))
        before(el)
        if (effect.useCss) {
            var className = getEffectClass(effect, "enter")
            //注意,css动画的发生有几个必要条件
            //1.定义了时长,2.有要改变的样式,3.必须插入DOM树 4.display不能等于none
            //5.document.hide不能为true, 6必须延迟一下才修改样式
            effect.update = function () {

                var eventName = effect.driver === "t" ? transitionEndEvent : animationEndEvent
                avalon(el).removeClass(className)
                el.addEventListener(eventName, function fn() {
                    el.removeEventListener(eventName, fn)
                    callEffectHook(effect, camelize("after-" + type))
                    after(el)
                })
            }

            avalon(el).addClass(className)
            buffer.render(true)
            buffer.queue.push(this)

        } else {

            callEffectHook(this, type, function () {

                callEffectHook(effect, camelize("after-" + type))
                after(el)
            })
        }
    }
}

function getEffectClass(instance, type) {
    var a = instance.callbacks[type + "Class"]
    if (typeof a === "string")
        return a
    if (typeof a === "function")
        return a
    return instance.name + "-" + type
}
function callEffectHook(effect, name, cb) {
    var hook = effect.callbacks[name]
    if (hook) {
        hook.call(effect, effect.el, cb)
    }
}

var PageVisibility = avalon.cssName("hide", document)
console.log(PageVisibility, "!!!")

var applyEffect = function (el, dir, before, after) {
    var effect = effectFactory(el)
    if (!effect) {
        before()
        if (after) {
            after()
        }
    } else {
        var method = dir ? 'enter' : 'leave'
        effect[method](before, after)
    }
}

avalon.mix(avalon.effect, {
    append: function (el, parent, after) {

        applyEffect(el, 1, function () {
            parent.appendChild(el)
        }, after)
    },
    before: function (el, parent, after) {
        applyEffect(el, 1, function () {
            parent.insertBefore(el, parent.firstChild)
        }, after)
    },
    remove: function (el, parent, after) {
        applyEffect(el, 0, function () {
            parent.removeChild(el)
        }, after)
    },
    move: function (el, otherParent, after) {
        applyEffect(el, 0, function () {
            otherParent.appendChild(el)
        }, after)
    }
})


//transtion动画
//首先元素必须添加一个带transition-duration的类名,或者在内联style指定transition-duration
//(这个可能有厂商前缀,如-webkit,-o-)
//然后定义一组类名, 通常包括两个,一个表示进入时触发的动画,另一个是表示离开时触发的动画
//如果是repeat可以支持更多动画效果
//如果你的动画没有在avalon.effects上注册,这两个类名,默认是在动画名后加上"-enter","-leave"
//如你的动画名是flip ,那么框架在进入时添加flip-enter类名, 离开时添加flip-leave
//如果你要注册动画,其代码如下:
/*
 * 
 avalon.effect("bounce",{
 enterClass: "bounce-in",
 leaveClass: "bounce-out"
 })
 * 
 */
//这样在运行动画时,框架为你元素添加上的是.bounce-in, .bounce-out,而不是.bounce-enter, .bounce-leave
//如果你想随机执行各种动画效果, 这两个配置项可以改成函数
/*
 var ani = ["rotate-in", "flip", "zoom-in", "roll", "speed","elastic"]
 var lastIndex = NaN
 function getRandomAni(){
 while(true){
 var index =  ~~Math.random() * 6
 if(index != lastIndex){
 lastIndex = index
 return ani[index]
 }
 }
 }
 avalon.effect("bounce",{
 enterClass: getRandomAni
 leaveClass: getRandomAni
 })
 */

//
//animation动画
//首先元素必须添加一个带animation-duration的类名,或者在内联style指定animation-duration
//其他流程一样

