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
    update: function (val) {
        var elem = this.element
        if (val) {
            avalon.effect.apply(elem, 1, function () {
                var data = elem.getAttribute("data-effect-driver") || "a"
                if (/^[atn]/.test(data)) {
                  console.log("update")
                 //   elem.style.display = ""//这里jQuery会自动处理
                    if (avalon(elem).css("display") === "none") {
                        elem.style.display = parseDisplay(elem.nodeName)
                    }
                }
            })
        } else {
            avalon.effect.apply(elem, 0, function () {
                elem.style.display = "none"
            })

        }
    }
})
