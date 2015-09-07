/**
 * @cnName doublelist组件
 * @enName doublelist
 * @introduce
 *  <p> 以左右列表形式展示实现的复选组件，不支持ms-duplex，请在onChange回调里面处理类似ms-duplex逻辑</p>
 */
define(["avalon", "text!./avalon.doublelist.html", "css!./avalon.doublelist.css", "css!../chameleon/oniui-common.css"], function(avalon, template) {
    var _interface = function () {}

    avalon.component("oni:doublelist", {
        // 内部变量
        _leftItems: [],
        _rightItems: [],

        // 内部方法
        _leftToggleActive: _interface,
        _rightToggleActive: _interface,
        _moveToRight: _interface,
        _moveToLeft: _interface,
        _initLeftItems: _interface,
        _initSelected: _interface,

        // 配置项
        data: [],
        selected: [],
        hideSelect: false,

        // 回调方法
        onChange: _interface,

        // 模板
        $template: template,

        $construct: function (aaa, bbb, ccc) {
            var options = avalon.mix(aaa, bbb, ccc)
            return options
        },

        $init: function (vm) {
            vm._initLeftItems = function(){
                if(vm.data && vm.data.length > 0){
                    vm._leftItems = []
                    vm._rightItems = []

                    avalon.each(vm.data, function(index, dataItem){
                        vm._leftItems.push({
                            name: dataItem.name,
                            value: dataItem.value,
                            active: false,
                            disabled: false,
                            visible: true
                        })
                    })
                }
            }

            vm._initSelected = function(){
                if(vm.data && vm.data.length > 0){
                    for(var i = 0, len = vm._leftItems.length; i < len; i++){
                        vm._leftItems[i].active = false
                    }

                    avalon.each(vm.selected, function(index, selectedItem){
                        for(var i = 0, len = vm._leftItems.length; i < len; i++){
                            if(selectedItem === vm._leftItems[i]['value']){
                                vm._leftItems[i].active = true
                            }
                        }
                    })
                }
            }

            if(vm.data && vm.data.length > 0){
                vm._initLeftItems()
            }

            if(vm.selected && vm.selected.length > 0){
                vm._initSelected()
            }
        },

        $ready: function (vm) {
            vm._leftToggleActive = function(index){
                var currentItem = vm._leftItems[index]

                if(currentItem.disabled){
                    return
                } else{
                    currentItem.active = !currentItem.active
                }
            }

            vm._rightToggleActive = function(index){
                var currentItem = vm._rightItems[index]
                currentItem.active = !currentItem.active
            }

            vm._moveToRight = function(){
                moveToAnotherSide(vm._leftItems, vm._rightItems)
                removeActiveItems(vm._leftItems, vm.hideSelect)

                setTimeout(function(){
                    vm.onChange(getCurrentData(vm.$model._rightItems))
                }, 0)
            }

            vm._moveToLeft = function(){
                if(vm.hideSelect){
                    moveToAnotherSide(vm._rightItems, vm._leftItems)
                } else{
                    unDisabledItems(vm._rightItems, vm._leftItems)
                }

                setTimeout(function(){
                    vm.onChange(getCurrentData(vm.$model._rightItems))
                }, 0)

                // always remove active
                removeActiveItems(vm._rightItems, true)
            }

            vm.$watch("data", function(){
                vm._initLeftItems()
            })

            vm.$watch("selected", function(v){
                vm._initSelected()
            })
        }
    })

    function moveToAnotherSide(origin, target){
        avalon.each(origin.$model, function(index, originItem){
            if(originItem.active){
                var targetItem = avalon.mix(true, {}, originItem)
                targetItem.active = false
                target.push(targetItem)
            }
        })
    }

    function unDisabledItems(origin, target){
        avalon.each(origin, function(index, originItem){
            if(originItem.active){
                avalon.each(target, function(targetIndex, targetItem){
                    if(originItem.value === targetItem.value){
                        target[targetIndex].disabled = false
                    }
                })
            }
        })
    }

    function removeActiveItems(activeItems, hideSelect){
        var activePositions = []

        avalon.each(activeItems, function(index, item){
            if(item.active){
                if(!hideSelect){
                    item.disabled = true
                } else{
                    activePositions.unshift(index)
                }
                item.active = false
            }
        })

        if(hideSelect) {
            for (var i in activePositions) {
                activeItems.splice(activePositions[i], 1)
            }
        }
    }

    function getCurrentData(rightItems){
        var currentData = []

        avalon.each(rightItems, function(index, item){
            currentData.push(item.value)
        })

        return currentData
    }

    return avalon;
})