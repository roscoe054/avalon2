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
    update: function (val, elem) {
        if (val) {
            elem.style.display = ""
            if (avalon(elem).css("display") === "none") {
                elem.style.display = parseDisplay(elem.nodeName)
            }
        } else {
            elem.style.display = "none"
        }
    }
})
