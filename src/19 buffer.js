
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
var buffer = {
    render: function () {
        if (!this.locked) {
            this.locked = 1
            avalon.nextTick(function () {
                console.log("flush")
                buffer.flush()
            })
        }
    },
    queue: [],
    flush: function () {
        for (var i = 0, sub; sub = this.queue[i++]; ) {
            sub.update()
        }
        this.queue.length = this.locked = 0
        this.queue = []
    }
}

avalon.transition = function(name, defination){
    
}

/*
	  transition: function (target, cb) {
	    var self = this
	    var current = this.childVM
	    this.unsetCurrent()
	    this.setCurrent(target)
	    switch (self.transMode) {
	      case 'in-out':
	        target.$before(self.anchor, function () {
	          self.remove(current, cb)
	        })
	        break
	      case 'out-in':
	        self.remove(current, function () {
	          if (!target._isDestroyed) {
	            target.$before(self.anchor, cb)
	          }
	        })
	        break
	      default:
	        self.remove(current)
	        target.$before(self.anchor, cb)
	    }
	  },
                  
                  
	  update: function (id, oldId) {
	    var el = this.el
	    var vm = this.el.__vue__ || this.vm
	    var hooks = _.resolveAsset(vm.$options, 'transitions', id)
	    id = id || 'v'
	    el.__v_trans = new Transition(el, id, hooks, vm)
	    if (oldId) {
	      _.removeClass(el, oldId + '-transition')
	    }
	    _.addClass(el, id + '-transition')
	  }
          
         */