/*********************************************************************
 *                          定时GC回收机制                             *
 **********************************************************************/
var disposeCount = 0
var disposeQueue = avalon.$$subscribers = []
var beginTime = new Date()
var oldInfo = {}

function getUid(data) { //IE9+,标准浏览器
    if (!data.uniqueNumber) {
        var elem = data.element
        if (elem) {
            if (elem.nodeType !== 1) {
                //如果是注释节点,则data.pos不存在,当一个元素下有两个注释节点就会出问题
                data.uniqueNumber = data.type + "-" + getUid(elem.parentNode) + "-" + (++disposeCount)
            } else {
                data.uniqueNumber = data.name + "-" + getUid(elem)
            }
        } else {
            data.uniqueNumber = ++disposeCount
        }
    }
    return data.uniqueNumber
}

//添加到回收列队中
function injectDisposeQueue(data, list) {
    var lists = data.lists || (data.lists = [])
    var uuid = getUid(data)
    avalon.Array.ensure(lists, list)
    list.$uuid = list.$uuid || generateID()
    if (!disposeQueue[uuid]) {
        disposeQueue[uuid] = 1
        disposeQueue.push(data)
    }
}

function rejectDisposeQueue(data) {

    var i = disposeQueue.length
    var n = i
    var allTypes = []
    var iffishTypes = {}
    var newInfo = {}
    //对页面上所有绑定对象进行分门别类, 只检测个数发生变化的类型
    while (data = disposeQueue[--i]) {
        var type = data.type
        if (newInfo[type]) {
            newInfo[type]++
        } else {
            newInfo[type] = 1
            allTypes.push(type)
        }
    }
    var diff = false
    allTypes.forEach(function (type) {
        if (oldInfo[type] !== newInfo[type]) {
            iffishTypes[type] = 1
            diff = true
        }
    })
    i = n
    if (diff) {
        while (data = disposeQueue[--i]) {
            if (data.element === null) {
                disposeQueue.splice(i, 1)
                continue
            }
            if (iffishTypes[data.type] && shouldDispose(data.element)) { //如果它没有在DOM树
                disposeQueue.splice(i, 1)
                delete disposeQueue[data.uniqueNumber]
                var lists = data.lists
                for (var k = 0, list; list = lists[k++]; ) {
                    avalon.Array.remove(lists, list)
                    avalon.Array.remove(list, data)
                }
                disposeData(data)
            }
        }
    }
    oldInfo = newInfo
    beginTime = new Date()
}

function disposeData(data) {
    delete disposeQueue[data.uniqueNumber] // 先清除，不然无法回收了
    data.element = null
    data.rollback && data.rollback()
    for (var key in data) {
        data[key] = null
    }
}

function shouldDispose(el) {
    try {//IE下，如果文本节点脱离DOM树，访问parentNode会报错
        var fireError = el.parentNode.nodeType
    } catch (e) {
        return true
    }
    if (el.ifRemove) {
        // 如果节点被放到ifGroup，才移除
        if (!root.contains(el.ifRemove) && (ifGroup === el.parentNode)) {
            el.parentNode && el.parentNode.removeChild(el)
            return true
        }
    }
    return el.msRetain ? 0 : (el.nodeType === 1 ? !root.contains(el) : !avalon.contains(root, el))
}


