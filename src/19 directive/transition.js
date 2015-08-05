avalon.directive("transition", {
    priority: 105,
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
        var className = arr[0]
        var elem = this.elem
        var inlineStyles = elem.style
        var computedStyles = window.getComputedStyle ? window.getComputedStyle(elem) : null
        if (computedStyles && (supportTransition || supportAnimation)) {
            avalon(elem).addClass("")
            //如果支持CSS动画
            if (supportTransition) {
                var duration = inlineStyles[transitionDuration] || computedStyles[transitionDuration] || ""
                if (duration && duration !== '0s') {
                   var type = "transition"
                }
            } else {
                duration = inlineStyles[supportAnimation] || computedStyles[supportAnimation] || ""
                if (duration && duration !== '0s') {
                    type = "animation"
                }

            }
            if(type) {
                
            }

        }

    }
})

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

