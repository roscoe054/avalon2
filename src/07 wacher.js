function $watch(expr, binding) {
    var $events = this.$events || (this.$events = {})
    var queue = $events[expr] || ($events[expr] = [])
    if (typeof binding === "function") {
        var backup = binding
        backup.uuid = Math.random()
        binding = {
            element: root,
            type: "user-watcher",
            handler: noop,
            vmodels: [this],
            expr: expr,
            uuid: backup.uuid
        }
    }
    if (!binding.update) {
        avalon.injectBinding(binding)
        if (backup) {
            binding.handler = backup
        }
    } else {
        avalon.Array.ensure(queue, binding)
    }
    return function () {
        binding.update = binding.evaluator = binding.handler = noop
        binding.element = DOC.createElement("a")
    }
}

function $emit(key, args) {

    var event = this.$events
    if (event && event[key]) {
        notifySubscribers(event[key], args)
    } else {
        var parent = this.$up
        if (parent) {
            $emit.call(parent, this.$pathname + "." + key, args)
            $emit.call(parent, this.$pathname + ".*", args)
        }
    }
}

function collectDependency(subs) {
    dependencyDetection.collectDependency(subs)
}

function notifySubscribers(subs, args) {
    if (!subs)
        return
    if (new Date() - beginTime > 444 && typeof subs[0] === "object") {
        rejectDisposeQueue()
    }
    if (kernel.async) {
        buffer.render()
        for (var i = 0, sub; sub = subs[i++]; ) {
            if (sub.update) {
                sub.fireArgs = args
                var uuid = getUid(sub)
                if (!buffer.queue[uuid]) {
                    buffer.queue[uuid] = 1
                    buffer.queue.push(sub)
                }
            }
        }
    } else {
        for (i = 0; sub = subs[i++]; ) {
            if (sub.update) {
                sub.fireArgs = args
                sub.update()//最小化刷新DOM树
            }
        }
    }
}