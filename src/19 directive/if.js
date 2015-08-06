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
            if (elem.nodeType === 8) {
                elem.parentNode.replaceChild(binding.template, elem)
                //   animate.enter(binding.template, elem.parentNode)
                elem = binding.element = binding.template //这时可能为null
            }
            if (elem.getAttribute(binding.name)) {
                elem.removeAttribute(binding.name)
                scanAttr(elem, binding.vmodels)
            }
            binding.rollback = null
        } else { //移出DOM树，并用注释节点占据原位置
            if (elem.nodeType === 1) {
                var node = binding.element = DOC.createComment("ms-if")


                elem.parentNode.replaceChild(node, elem)
                //     animate.leave(elem, node.parentNode, node)
                binding.template = elem //元素节点
                ifGroup.appendChild(elem)
                binding.rollback = function () {
                    if (elem.parentNode === ifGroup) {
                        ifGroup.removeChild(elem)
                    }
                }
            }
        }
    }
})


