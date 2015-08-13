duplexBinding.SELECT = function (element, evaluator, binding) {
    var $elem = avalon(element)

    function updateVModel() {
        if ($elem.data("duplexObserve") !== false) {
            var val = $elem.val() //字符串或字符串数组
            if (Array.isArray(val)) {
                val = val.map(function (v) {
                    return binding.pipe(v, binding, "get")
                })
            } else {
                val = binding.pipe(val, binding, "get")
            }

            if (quote(val) !== quote(binding.oldValue)) {
                evaluator(val)
                binding.changed.call(element, val, binding.oldValue)
            }
        }
    }
    var changeOnce = binding.changed
    binding.handler = function () {
        var val = evaluator()
        if (Array.isArray(val)) {
            if (!element.multiple) {
                log("ms-duplex在<select multiple=true>上要求对应一个数组")
            }
        } else {
            if (element.multiple) {
                log("ms-duplex在<select multiple=false>不能对应一个数组")
            }
        }
        //必须变成字符串后才能比较
        $elem.val(val)
        if (changeOnce) {
            changeOnce.call(element, val, binding.oldValue)
            changeOnce = null
        }
    }

    avalon.bind(element, "datasetchanged", function (e) {
        if (e.fireDuplex) {
            e.stopPropagation()
            binding.handler()
        }
    })

    binding.bound("change", updateVModel)

}
