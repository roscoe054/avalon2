var $watch = function (expr, binding) {
    this.$events = {}
    var queue = this.$events[expr] = this.$events[expr] || []
    if (typeof binding === "function") {
        var backup = binding
        binding = {
            element: root,
            type: "user-watcher",
            handler: noop,
            vmodels: [this],
            expr: expr
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
}

function emit(key, target) {
    var event = target.$events
    if (event && event[key]) {
        notifySubscribers(event[key])
    } else {
        var parent = target.$up
        if (parent) {
            emit(target.$pathname + "." + key, parent)
            emit(target.$pathname + ".*", parent)
        }
    }
}