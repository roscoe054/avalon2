avalon.directive("css", {
    init: directives.attr.init,
    update: function (val, elem, binding) {
        avalon(elem).css(binding.param, val)
    }
})
