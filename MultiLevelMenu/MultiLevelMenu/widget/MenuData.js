// JSLint options:
/*global dojo */
dojo.provide("MultiLevelMenu.widget.MenuData");
dojo.declare("MultiLevelMenu.widget.MenuData", null, {
    childCache: [],
    menuWidget: null,
    rendering: false,    
    menuDataRecursive: [],
    
    constructor: function (inputargs) {
        "use strict";
        // Copies the needed input parameters
        this.menuDataRecursive = [];
        this.childCache= [];
        for (var input in inputargs) {
            if (inputargs.hasOwnProperty(input)) {
                var param = {};
                param[input] = inputargs[input];
                dojo.mixin(this, param);
            }
        }
    },

    loadData: function(){
        // Combined loading function for recursive and non recursice menu
        this.rendering = false;
        if (this.recursive === true) {
            this.menuDataRecursive = [];
            mendix.lang.sequence([this.loadMenuDataRecursiveChild, this.loadMenuDataRecursiveRoot],null, this); // load child before parents  
        } else {
            this.loadMenuData();
        }  
    },
    
    // --------- Recursive Loading ---------//
    loadMenuDataRecursiveChild: function (callback) {
        // Retrieve all child Data
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
            var constraint = this.menuLevels[0].refSourceEntityConstraint.replace('[%CurrentObject%]', this.context.getGuid());  
            mx.data.get({
                xpath: "//" + this.menuLevels[0].refSourceEntity + constraint,
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
    },

    loadMenuDataRecursiveRoot: function (callback) {
        // Retreive all root data
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
            var constraint = this.entityConstraint.replace('[%CurrentObject%]', this.context.getGuid()); 
            mx.data.get({
                xpath: "//" + this.selectEntity + constraint,
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
    },

    buildCacheTable: function (objs) {
        // Build cache table for performance improvement 
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
    },

    filter: function (parentMenu) {
        // find children in cache table for give parent
        if (parentMenu.guid in this.childCache) {
            return this.childCache[parentMenu.guid];
        } else {
            return [];
        }
    },

    cbLoadMenuDataRecursive: function (parentMenu, objs) {
        // store data of the menu in the menu object
        var o = null;
        var childMenus = [];
        for (var i = 0; i < objs.length; i++) {
            if (this.menuWidget.checkMenuSize())
                break;
            o = objs[i];
            var subMenu = {
                guid: o.getGuid(),
                label: o.get(this.displayLabel),
                children: null,
                loaded: false
            };
            childMenus.push(subMenu);
            if (parentMenu === null) { // root menu does not have parents.
                this.menuDataRecursive = childMenus;
            } else {
                parentMenu.children = childMenus;
            }
        }
        for (var i = 0; i < childMenus.length; i++) {
            this.cbLoadMenuDataRecursive(childMenus[i], this.filter(childMenus[i]));
        }

        if (objs.length === 0) {
            if (!parentMenu) { // is empty root
                this.menuWidget.appendMenu([]);
            } else {
                parentMenu.loaded = true;
                this.checkMenuComplete();
            }
        }
    },

    checkMenuComplete: function () {
        // when complete, attach menu to button
        if (!this.rendering && this.checkMenuCompleteRecrusive(this.menuDataRecursive)) {
            this.rendering = true;
            this.menuWidget.appendMenu(this.menuDataRecursive); //TODO Work with callback
        }
    },

    checkMenuCompleteRecrusive: function (menu) {
        // Checks if of all leafs are loaded
        for (var i = 0; i < menu.length; i++) {
            if (menu[i].children === null && menu[i].loaded === false) {
                return false;
            } else if (menu[i].children !== null) {
                if (!this.checkMenuCompleteRecrusive(menu[i].children))
                    return false;
            }
        }
        return true;
    },

    // ----- non Recursive Loading ----/
    loadMenuData: function () {
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
            var constraint = this.entityConstraint.replace('[%CurrentObject%]', this.context.getGuid()); 
            mx.data.get({
                xpath: "//" + this.selectEntity + constraint,
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
    },
    
    cbLoadMenuDataLeafs: function (level, objs) {
        // fill data of the leafs (selectable entities)
        var parents = [];
        var o = null;
        for (var i = 0; i < objs.length; i++) {
            o = objs[i];
            if(this.dsMicroflow)
                var parentIndex = o.get(this.menuLevels[level].reference);
            else
                var parentIndex = o.get(this.menuLevels[level].reference).guid;
            if (parentIndex) {
                if (this.menuWidget.checkMenuSize())
                    return;
                var menuItem = {
                    guid: o.getGuid(),
                    label: o.get(this.displayLabel),
                    children: null
                };
                if (parentIndex in parents) { // append child
                    parents[parentIndex].push(menuItem);

                } else { // first child
                    parents[parentIndex] = [menuItem];
                }
            }
        }
        this.getParentLevel(parents, level);
    },

    getParentLevel: function (menuData, level) {
        // get the details of the parents
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
    },

    cbLoadMenuDataParents: function (level, menuData, objs) {
        // Fill labels of the parents
        var nextLevel = level + 1;
        if (this.menuLevels.length > nextLevel) {
            var parents = [];
            var o = null;
            for (var i = 0; i < objs.length; i++) {
                o = objs[i];
                var parentIndex = o.get(this.menuLevels[nextLevel].reference);
                if (parentIndex !== "") {
                    if (this.menuWidget.checkMenuSize())
                        break;
                    var menuItem = {
                        guid: o.getGuid(),
                        label: o.get(this.menuLevels[level].labelAttribute),
                        children: menuData[o.getGuid()]
                    };
                    if (parentIndex in parents) {
                        parents[parentIndex].push(menuItem);

                    } else {
                        parents[parentIndex] = [menuItem];
                    }
                }
            }
        } else if (this.menuLevels.length === nextLevel) { // menu complete, set first level
            var completeMenu = [];
            var o = null;
            for (var i = 0; i < objs.length; i++) {
                o = objs[i];
                if (this.menuWidget.checkMenuSize())
                    break;
                var menuItem = {
                    guid: o.getGuid(),
                    label: o.get(this.menuLevels[level].labelAttribute),
                    children: menuData[o.getGuid()]
                };
                completeMenu.push(menuItem);
            }
            this.menuWidget.appendMenu(completeMenu); // TODO Work with callback
        }
        if (this.menuLevels.length > nextLevel)
            this.getParentLevel(parents, nextLevel);
    }
});