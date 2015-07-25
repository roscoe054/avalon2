//处理radio, checkbox, text, textarea, password
duplexBinding.INPUT = function(element, evaluator, binding) {
    var $type = element.type,
        bound = binding.bound,
        $elem = avalon(element),
        composing = false

        function callback(value) {
            binding.changed.call(this, value, binding)
        }

        function compositionStart() {
            composing = true
        }

        function compositionEnd() {
            composing = false
        }
        //当value变化时改变model的值

    var updateVModel = function() {
        if (composing) //处理中文输入法在minlengh下引发的BUG
            return
        var val = element.oldValue = element.value //防止递归调用形成死循环
        var lastValue = binding.pipe(val, binding, "get")
        if ($elem.data("duplexObserve") !== false) {
            evaluator(lastValue)
            callback.call(element, lastValue)
        }
    }
    //当model变化时,它就会改变value的值
    binding.handler = function() {
        var val = binding.pipe(evaluator(), binding, "set") + ""
        if (val !== element.oldValue) {
            element.value = val
        }
    }
    if (binding.isChecked || $type === "radio") {
        updateVModel = function() {
            if ($elem.data("duplexObserve") !== false) {
                var lastValue = binding.pipe(element.value, binding, "get")
                evaluator(lastValue)
                callback.call(element, lastValue)
            }
        }
        binding.handler = function() {
            var val = evaluator()
            var checked = binding.isChecked ? !! val : val + "" === element.value
            element.checked = element.oldValue = checked
        }
        bound("click", updateVModel)
    } else if ($type === "checkbox") {
        updateVModel = function() {
            if ($elem.binding("duplexObserve") !== false) {
                var method = element.checked ? "ensure" : "remove"
                var array = evaluator()
                if (!Array.isArray(array)) {
                    log("ms-duplex应用于checkbox上要对应一个数组")
                    array = [array]
                }
                avalon.Array[method](array, binding.pipe(element.value, binding, "get"))
                callback.call(element, array)
            }
        }
        binding.handler = function() {
            var array = [].concat(evaluator()) //强制转换为数组
            element.checked = array.indexOf(binding.pipe(element.value, binding, "get")) > -1
        }
        bound("change", updateVModel)
    } else {
        var events = element.getAttribute("data-duplex-event") || "input"
        if (element.attributes["data-event"]) {
            log("data-event指令已经废弃，请改用data-duplex-event")
        }
        events.replace(rword, function(name) {
            switch (name) {
                case "input":
                    bound("input", updateVModel)
                    bound("DOMAutoComplete", updateVModel)
                    if (!IEVersion) {
                        bound("compositionstart", compositionStart)
                        bound("compositionend", compositionEnd)
                    }
                    break
                default:
                    bound(name, updateVModel)
                    break
            }
        })
        bound("focus", function() {
            element.msFocus = true
        })
        bound("blur", function() {
            element.msFocus = false
        })
        if (rmsinput.test($type)) {
            watchValueInTimer(function() {
                if (root.contains(element)) {
                    if (!element.msFocus && element.oldValue !== element.value) {
                        updateVModel()
                    }
                } else if (!element.msRetain) {
                    return false
                }
            })
        }

        element.avalonSetter = updateVModel
    }

    element.oldValue = element.value
    avalon.injectBinding(binding)
    callback.call(element, element.value)
}
duplexBinding.TEXTAREA = duplexBinding.INPUT