function parseDisplay(nodeName, val) {
    //用于取得此类标签的默认display值
    var key = "_" + nodeName
    if (!parseDisplay[key]) {
        var node = DOC.createElement(nodeName)
        root.appendChild(node)
        if (W3C) {
            val = getComputedStyle(node, null).display
        } else {
            val = node.currentStyle.display
        }
        root.removeChild(node)
        parseDisplay[key] = val
    }
    return parseDisplay[key]
}

avalon.parseDisplay = parseDisplay

avalon.directive("visible", {
    init: function (binding) {
        var elem = binding.element
        var display = elem.style.display
        if (display === "none") {
            display = parseDisplay(elem.nodeName)
        }
        binding.display = display
    },
    update: function (val, elem, binding) {
        elem.style.display = val ? binding.display : "none"
    }
})
