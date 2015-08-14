
function collectDependency(subs) {
    dependencyDetection.collectDependency(subs)
}

function notifySubscribers(subs) {
    if (!subs)
        return
    if (new Date() - beginTime > 444 && typeof subs[0] === "object") {
        rejectDisposeQueue()
    }
    if (kernel.async) {
        buffer.render()
        for (var i = 0, sub; sub = subs[i++]; ) {
            if (sub.update) {
                var uuid = getUid(sub)
                if (!buffer.queue[uuid]) {
                    buffer.queue[uuid] = 1
                    buffer.queue.push(sub)
                }
            }
        }
    } else {
        for (i = 0; sub = subs[i++]; ) {
            sub.update && sub.update()//最小化刷新DOM树
        }
    }
}
//使用来自游戏界的双缓冲技术,减少对视图的冗余刷新
//var buffer = {
//    render: function (isAnimate) {
//        if (!this.locked) {
//            this.locked = isAnimate ? root.offsetHeight + 10 : 1
//            avalon.nextTick(function () {
//                buffer.flush()
//            })
//        }
//    },
//    queue: [],
//    flush: function () {
//        for (var i = 0, sub; sub = this.queue[i++]; ) {
//            sub.update()
//        }
//        this.queue.length = this.locked = 0
//        this.queue = []
//    }
//}

var Buffer = function () {
    this.queue = []
}
Buffer.prototype = {
    render: function (isAnimate) {
        if (!this.locked) {
            this.locked = isAnimate ? root.offsetHeight + 10 : 1
            var me = this
            avalon.nextTick(function () {
                me.flush()
            })
        }
    },
    flush: function () {
        for (var i = 0, sub; sub = this.queue[i++]; ) {
            sub.update()
        }
        this.queue.length = this.locked = 0
        this.queue = []
    }
}

var buffer = new Buffer()