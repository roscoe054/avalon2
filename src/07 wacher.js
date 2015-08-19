var $watch = function (expr, binding) {
    this.$events = {}
    var queue = this.$events[expr] = this.$events[expr] || []

    if (!binding.evaluator) {
        binding.evaluator = parseExpr(binding.expr, binding.vmodels, binding)
        binding.add.forEach(function (a) {
            a.v.$watch(a.p, binding)
        })
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