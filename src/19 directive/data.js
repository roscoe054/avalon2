avalon.directive("data", {
    update: function (val, elem, binding) {
        var key = "data-" + binding.param
        if (val && typeof val === "object") {
            elem[key] = val
        } else {
            elem.setAttribute(key, String(val))
        }
    }
})

