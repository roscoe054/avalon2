duplexBinding.SELECT = function(element, evaluator, binding) {
    var $elem = avalon(element)

        function updateVModel() {
            if ($elem.data("duplexObserve") !== false) {
                var val = $elem.val() //字符串或字符串数组
                if (Array.isArray(val)) {
                    val = val.map(function(v) {
                        return binding.pipe(v, binding, "get")
                    })
                } else {
                    val = binding.pipe(val, binding, "get")
                }
                if (val + "" !== element.oldValue) {
                    evaluator(val)
                }
                binding.changed.call(element, val, binding)
            }
        }
    binding.handler = function() {
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
        val = Array.isArray(val) ? val.map(String) : val + ""
        if (val + "" !== element.oldValue) {
            $elem.val(val)
            element.oldValue = val + "" 
        }
    }
    binding.bound("change", updateVModel)
    element.msCallback = function() {
        binding.handler()
        binding.changed.call(element, evaluator(), binding)
    }
}