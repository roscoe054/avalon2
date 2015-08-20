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
        if (/\w\.*\B/.test(expr)) {
            binding.evaluator = noop
            binding.update = function (x) {
                var args = this.fireArgs || []
                if (args[2])
                    binding.handler.apply(this, args)
                delete this.fireArgs
            }
            queue.sync = true
            avalon.Array.ensure(queue, binding)
        } else {
            avalon.injectBinding(binding)
        }
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
            if (args) {
                args[2] = this.$pathname + "." + key
            }
            $emit.call(parent, this.$pathname + "." + key, args)//以确切的值往上冒泡
            $emit.call(parent, this.$pathname + ".*", args)//以模糊的值往上冒泡
        }
    }
}

function collectDependency(el, key) {
   do {
        if (el.$watch) {
            var e = el.$events || (el.$events = {})
            var array = e[key] || (e[key] = [])
            dependencyDetection.collectDependency(array)
            return
        }
        el = el.$up
        if (el) {
            key = el.$pathname + "." + key
        } else {
            break
        }

    } while (true)
}

function notifySubscribers(subs, args) {
    if (!subs)
        return
    if (new Date() - beginTime > 444 && typeof subs[0] === "object") {
        rejectDisposeQueue()
    }
    if (kernel.async && !subs.sync) {
        buffer.render()
        for (var i = 0, sub; sub = subs[i++]; ) {
            if (sub.update) {
                if (args) {
                    sub.fireArgs = args
                }
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
                if (args) {
                    sub.fireArgs = args
                }
                sub.update()//最小化刷新DOM树
            }
        }
    }
}