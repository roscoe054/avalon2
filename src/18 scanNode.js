function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
}


function scanNodeArray(nodes, vmodels) {
    for (var i = 0, node; node = nodes[i++]; ) {
        switch (node.nodeType) {
            case 1:
                var elem = node, fn
                if (!elem.msResolved && elem.parentNode && elem.parentNode.nodeType === 1) {
                    var library = isWidget(elem)
                    if (library) {
                        var widget = elem.localName ? elem.localName.replace(library + ":", "") : elem.nodeName
                        var fullName = library + ":" + camelize(widget)
                        scanTag(node, vmodels) //扫描元素节点
                        componentQueue.push({
                            library: library,
                            element: elem,
                            fullName: fullName,
                            widget: widget,
                            vmodels: vmodels,
                            name: "widget"
                        })
                        if (avalon.components[fullName]) {
                            avalon.component(fullName)
                        }
                    }
                }
                if (!widget) {
                    scanTag(node, vmodels) //扫描元素节点
                }
                if (node.msHasEvent) {
                    avalon.fireDom(node, "datasetchanged", {
                        bubble: node.msHasEvent
                    })
                }

                break
            case 3:
                if (rexpr.test(node.nodeValue)) {
                    scanText(node, vmodels, i) //扫描文本节点
                }
                break
        }

    }
}

