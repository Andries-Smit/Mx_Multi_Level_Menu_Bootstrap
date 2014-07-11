dojo.provide("MultiLevelMenu.widget.MenuData");

MultiLevelMenu.widget.MenuData = (function() {
    function loadMenuDataRecursiveChild  (callback) {
            var references = {};
            references[this.menuLevels[0].reference] = {
                attributes: [this.menuLevels[0].labelAttribute]
            };
            if (this.menuLevels[0].refDsMicroflow !== "") {
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: this.menuLevels[0].refDsMicroflow,
                        guids: [this.context.getGuid()]
                    },
                    callback: dojo.hitch(this, function (objs) {
                        this.buildCacheTable(objs);
                        callback();
                    }),
                    error: function (error) {
                        console.error("Error in loadMenuDataRecursive: " + error.description);
                        callback();
                    }
                });
            } else {
                mx.data.get({
                    xpath: "//" + this.menuLevels[0].refSourceEntity + this.menuLevels[0].refSourceEntityConstraint,
                    filter: {
                        attributes: [this.menuLevels[0].labelAttribute],
                        references: references,
                        sort: [
                            [this.menuLevels[0].labelAttribute, "asc"]
                        ],
                        offset: 0,
                        amount: this.maxMenuItems + 1
                    },
                    callback: dojo.hitch(this, function (objs) {
                        this.buildCacheTable(objs);
                        callback();
                    }),
                    error: function (error) {
                        console.error("Error in loadMenuDataRecursive: " + error.description);
                        callback();
                    }
                });
            }
        }
        
        function loadMenuDataRecursiveRoot (callback) {
            var references = {};
            references[this.menuLevels[0].reference] = {
                attributes: []
            };

            if (this.dsMicroflow) {
                mx.data.action({
                    params: {
                        applyto: "selection",
                        actionname: this.dsMicroflow,
                        guids: [this.context.getGuid()]
                    },
                    callback: dojo.hitch(this, this.cbLoadMenuDataRecursive, null),
                    error: function (error) {
                        console.error("Error in loadMenuDataRecursive via Microflow: " + error.description);
                    }
                });
            } else {
                mx.data.get({
                    xpath: "//" + this.selectEntity + this.entityConstraint,
                    filter: {
                        attributes: [this.menuLevels[0].labelAttribute],
                        references: references,
                        sort: [
                            [this.menuLevels[0].labelAttribute, "asc"]
                        ],
                        offset: 0,
                        amount: this.maxMenuItems + 1
                    },
                    callback: dojo.hitch(this, this.cbLoadMenuDataRecursive, null),
                    error: function (error) {
                        console.error("Error in loadMenuDataRecursive : " + error.description);
                    }
                });
            }
            callback && callback();
        }

        function buildCacheTable(objs) {
            this.childCache = [];
            for (var i = 0; i < objs.length; i++) {
                var guid = objs[i].getReference(this.menuLevels[0].reference);
                if (guid) { // has parent
                    if (guid in this.childCache) {
                        this.childCache[guid].push(objs[i]);
                    } else {
                        this.childCache[guid] = [objs[i]];
                    }
                }
            }
        }

        function filter (parentMenu) {
            if (parentMenu.guid in this.childCache) {
                return this.childCache[parentMenu.guid];
            } else {
                return [];
            }
        }

        // retreive the data of the menu. 
        function loadMenuDataRecursive (parentMenu) {
            this.cbLoadMenuDataRecursive(parentMenu, this.filter(parentMenu));
        }

        function cbLoadMenuDataRecursive  (parentMenu, objs) {
            // store data of the menu in the menu object
            var o = null;
            var childMenus = [];
            for (var i = 0; i < objs.length; i++) {
                if (this.checkMenuSize())
                    break;
                o = objs[i];
                var subMenu = {
                    guid: o.getGuid(),
                    label: o.get(this.displayLabel),
                    childeren: null,
                    loaded: false
                };
                childMenus.push(subMenu);
                if (parentMenu === null) { // root menu does not have parents.
                    this.menuDataRecursive = childMenus;
                } else {
                    parentMenu.childeren = childMenus;
                }
            }
            for (var i = 0; i < childMenus.length; i++) {
                this.cbLoadMenuDataRecursive(childMenus[i], this.filter(childMenus[i]));
            }

            if (objs.length === 0) {
                if (!parentMenu) { // is empty root
                    this.appendMenu([]);
                } else {
                    parentMenu.loaded = true;
                    this.checkMenuComplete();
                }
            }
        }

        function checkMenuComplete () {
            // when complete attach menu to button
            if (!this.rendering && this.checkMenuCompleteRecrusive(this.menuDataRecursive)) {
                this.rendering = true;
                this.appendMenu(this.menuDataRecursive);
            }
        }

        function heckMenuCompleteRecrusive (menu) {
            //Checks if of all leafs are loaded
            for (var i = 0; i < menu.length; i++) {
                if (menu[i].childeren === null && menu[i].loaded === false) {
                    return false;
                } else if (menu[i].childeren !== null) {
                    if (!this.checkMenuCompleteRecrusive(menu[i].childeren))
                        return false;
                }
            }
            return true;
        }

        function loadMenuData () {
            // load all data non recursive, load all leafs first
            var references = {};
            references[this.menuLevels[0].reference] = {
                attributes: []
            };
        if (this.dsMicroflow) {
            mx.data.action({
                params: {
                    applyto: "selection",
                    actionname: this.dsMicroflow,
                    guids: [this.context.getGuid()]
                },
                callback: dojo.hitch(this, this.cbLoadMenuDataLeafs, 0),
                error: function (error) {
                    console.error("Error in loadMenuDataRecursive via Microflow: " + error.description);
                }
            });
        } else {
            mx.data.get({
                xpath: "//" + this.selectEntity + this.entityConstraint,
                filter: {
                    attributes: [this.displayLabel],
                    references: references,
                    sort: [
                        [this.displayLabel, "asc"]
                    ],
                    offset: 0,
                    amount: this.maxMenuItems + 1
                },
                callback: dojo.hitch(this, this.cbLoadMenuDataLeafs, 0),
                error: function (error) {
                    console.error("Error in loadMenuData: " + error.description);
                }
            });
        }
        }

        function cbLoadMenuDataLeafs (level, objs) {
            //fill data of the leafs (selectable entityes)
            var parents = [];
            var o = null;
            for (var i = 0; i < objs.length; i++) {
                o = objs[i];
                var parentIndex = o.get(this.menuLevels[level].reference).guid;
                if (parentIndex) {
                    if (this.checkMenuSize())
                        return;
                    var menuItem = {
                        guid: o.getGuid(),
                        label: o.get(this.displayLabel),
                        childeren: null
                    };
                    if (parentIndex in parents) { // append child
                        parents[parentIndex].push(menuItem);

                    } else { // first child
                        parents[parentIndex] = [menuItem];
                    }
                }
            }
            this.getParentLevel(parents, level);
        }

        function getParentLevel (menuData, level) {
            //get the details of the parents
            var references = {};
            if (this.menuLevels.length > level + 1)
                references[this.menuLevels[level + 1].reference] = {};
            var guids = Object.keys(menuData);
            mx.data.get({
                guids: guids,
                filter: {
                    attributes: [this.menuLevels[level].labelAttribute],
                    references: references,
                    sort: [
                        [this.menuLevels[level].labelAttribute, "asc"]
                    ],
                    offset: 0,
                    amount: this.maxMenuItems + 1
                },
                callback: dojo.hitch(this, this.cbLoadMenuDataParents, level, menuData),
                error: function (error) {
                    console.error("Error in getParentLevel: " + error.description);
                }
            });
        }

        function cbLoadMenuDataParents (level, menuData, objs) {
            //Fill labels of the parents
            var nextLevel = level + 1;
            if (this.menuLevels.length > nextLevel) {
                var parents = [];
                var o = null;
                for (var i = 0; i < objs.length; i++) {
                    o = objs[i];
                    var parentIndex = o.get(this.menuLevels[nextLevel].reference);
                    if (parentIndex !== "") {
                        if (this.checkMenuSize())
                            break;
                        var menuItem = {
                            guid: o.getGuid(),
                            label: o.get(this.menuLevels[level].labelAttribute),
                            childeren: menuData[o.getGuid()]
                        };
                        if (parentIndex in parents) {
                            parents[parentIndex].push(menuItem);

                        } else {
                            parents[parentIndex] = [menuItem];
                        }
                    }
                }
            } else if (this.menuLevels.length === nextLevel) { // menu complate, set first level
                var completeMenu = [];
                var o = null;
                for (var i = 0; i < objs.length; i++) {
                    o = objs[i];
                    if (this.checkMenuSize())
                        break;
                    var menuItem = {
                        guid: o.getGuid(),
                        label: o.get(this.menuLevels[level].labelAttribute),
                        childeren: menuData[o.getGuid()]
                    };
                    completeMenu.push(menuItem);
                }
                this.appendMenu(completeMenu);
            }
            if (this.menuLevels.length > nextLevel)
                this.getParentLevel(parents, nextLevel);
        }
});
