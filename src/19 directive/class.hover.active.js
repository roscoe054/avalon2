//根据VM的属性值或表达式的值切换类名，ms-class="xxx yyy zzz:flag"
//http://www.cnblogs.com/rubylouvre/archive/2012/12/17/2818540.html
avalon.directive("class", {

    init: function (binding) {
        var oldStyle = binding.param,
            text = binding.value,
            rightExpr
        if (!oldStyle || isFinite(oldStyle)) {
            binding.param = "" //去掉数字
            var noExpr = text.replace(rexprg, function (a) {
                return a.replace(/./g, "0")
            })
            var colonIndex = noExpr.indexOf(":") //取得第一个冒号的位置
            if (colonIndex === -1) { // 比如 ms-class="aaa bbb ccc" 的情况
                var className = text
                var rightExpr = true
            } else { // 比如 ms-class-1="ui-state-active:checked" 的情况
                className = text.slice(0, colonIndex)
                rightExpr = text.slice(colonIndex + 1)
            }

            binding.expr = "[" + stringifyExpr(className) + "," + rightExpr + "]"

        } else {
            binding.expr = '[' + JSON.stringify(oldStyle) + "," + binding.expr + "]"
            binding.oldStyle = true
        }


        if (binding.type === "hover" || binding.type === "active") { //确保只绑定一次
            if (!binding.hasBindEvent) {
                var elem = binding.element
                var $elem = avalon(elem)
                var activate = "mouseenter" //在移出移入时切换类名
                var abandon = "mouseleave"
                if (method === "active") { //在聚焦失焦中切换类名
                    elem.tabIndex = elem.tabIndex || -1
                    activate = "mousedown"
                    abandon = "mouseup"
                    var fn0 = $elem.bind("mouseleave", function () {
                        binding.toggleClass && $elem.removeClass(binding.newClass)
                    })
                }
            }

            var fn1 = $elem.bind(activate, function () {
                binding.toggleClass && $elem.addClass(binding.newClass)
            })
            var fn2 = $elem.bind(abandon, function () {
                binding.toggleClass && $elem.removeClass(binding.newClass)
            })
            binding.rollback = function () {
                $elem.unbind("mouseleave", fn0)
                $elem.unbind(activate, fn1)
                $elem.unbind(abandon, fn2)
            }
            binding.hasBindEvent = true
        }

    },
    update: function (arr, elem, binding) {
        var $elem = avalon(elem)
        binding.newClass = arr[0]
        binding.toggleClass = !!arr[1]
        if (binding.type === "class") {
            if (binding.oldStyle) {
                $elem.toggleClass(binding.param, !!val)
            } else {
                if (binding.oldClass && binding.newClass !== binding.oldClass) {
                    $elem.removeClass(binding.oldClass)
                }
                binding.oldClass = binding.newClass
                $elem.toggleClass(binding.newClass, binding.toggleClass)
            }
        }
    }
})

"hover,active".replace(rword, function (name) {
    directives[name] = directives["class"]
})
