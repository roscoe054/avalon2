avalon.directive("if", {
    priority: 10,
    update: function (val) {
        var binding = this
        var elem = this.element
        try {
            if (!elem.parentNode)
                return
        } catch (e) {
            return
        }
        if (val) { //插回DOM树
            function alway() {
                if (elem.getAttribute(binding.name)) {
                    elem.removeAttribute(binding.name)
                    scanAttr(elem, binding.vmodels)
                }
                binding.rollback = null
            }
            if (elem.nodeType === 8) {
                var hasEffect = avalon.effect.apply(binding.keep, 1, function () {
                    elem.parentNode.replaceChild(binding.keep, elem)
                    elem = binding.element = binding.keep //这时可能为null
                    alway()
                })
                hasEffect = hasEffect === false
            }
            if (!hasEffect)
                alway()
        } else { //移出DOM树，并用注释节点占据原位置
            if (elem.nodeType === 1) {
                var node = binding.element = DOC.createComment("ms-if")
                avalon.effect.apply(elem, 0, function () {
                    elem.parentNode.replaceChild(node, elem)
                    binding.keep = elem //元素节点
                    ifGroup.appendChild(elem)
                    binding.rollback = function () {
                        if (elem.parentNode === ifGroup) {
                            ifGroup.removeChild(elem)
                        }
                    }
                })
            }
        }
    }
})


