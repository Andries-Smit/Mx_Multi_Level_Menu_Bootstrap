/*JSLINT: mendix, */
dojo.require("MultiLevelMenu.widget.MenuData");

mxui.dom.addCss(mx.moduleUrl('MultiLevelMenu') + 'widget/ui/MulitLevelMenu.css');
require(["dojo/dom-geometry", ], function (domGeom) {

    MultiLevelMenu = {
        mixins: [mendix.addon._Contextable, dijit._TemplatedMixin],
        inputargs: {
            //Appearence
            captionText: "",
            noMenuItemsCaption: "",
            icon: "",
            readonly: false,
            readonlyConditional: "",
            emptyCaptionText: "",
            clearText: "",
            loadingText: "",
            buttonStyle: "default",

            // behavior
            changeMicroflow: "",
            clickMicroflow: "",
            maxMenuItems: 1000,
            maxMicroflow: "",
            prefetch: "onclickOnce",
            parentSelectable: "true",
            //data source   
            entitynote: "",
            reference: "",
            displayFormat: "",

            //menu level
            recursive: "",
            menuLevels: [], //{refDsMicroflow}
            refSourceEntity: "",
            menuReference: "",
            labelAttribute: "",
            displayLabel: "",

            //selectable objects
            entityConstraint: "",
            dsMicroflow: "",
            class: "",
        },

        //Caches
        domNode: null,
        context: null,
        mlMenuButton: null,
        readOnlyBool: false,
        isInactive: false,
        isDisabled: false,
        validationDiv: null,
        selectEntity: "",
        targetReferece: "",
        menuDataRecursive: [],
        handler: null,
        handlerReference: null,
        handlerValidation: null,
        counterMenuItem: 0,
        errorMenu: false,
        btnGroup: null,
        button: null,
        dropDownButton: null,
        shown: false,
        label: null,
        baseClass: "multiLevelMenu",
        templatePath: dojo.moduleUrl("MultiLevelMenu", "widget/ui/MultiLevelMenu.html"),
        dataLoaded: false,
        loadingMenuNode: null,
        noMenuItemsNode: null,
        menuNode: null,
        childCache: null,

        // ISSUE :
        // 
        // TODO: 
        // Make us dojo template attach event
        // Inline-block button and menu button (Will wrap when with is to long.)
        // Render as normal drop down button (not split)
        // Menu Data File split
        //                
        // OPTIONAL:
        // different buttons: normal, split button, input,   
        // Add key escape event to close menu?  
        // Split into 2 difference widgets : normal and recursive  
        // Navigation header in menu with entity name  <li class="nav-header">Organisation</li>
        // Menu does not close, when other menu is opened, on leave menu close
        // 
        // DONE drop up and left based on screen position?  http://www.bootply.com/92442  
        // DONE test with large set of data
        // DONE make max menu size input parameter
        // DONE clear with list header and close button <li class="nav-header">List header<button type="button" class="close" data-dismiss="modal" aria-hidden="true">x</button></li>
        // DONE When max result, have a MF to be clicked to open an alternative.
        // DONE render clear button as anchor. <a tabindex="-1" href="#">(clear cat)<button type="button" class="close">x</button></a> //css a.clear{ padding-right: 8px};
        // DONE add diveder above clear button  <li role="presentation" class="divider"></li>
        // DONE make use of dojo template
        // DONE disabled button looks strange
        // DONE Bootstrap 3 menu should have presentation role <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>
        // DONE Lazy Loading
        // DONE add mf for split button
        // DONE open submenu onclick too, make it mobile accessible.
        // DONE close open submenus on hover clear button.
        // DONE close open submenus when over over items that have no sub menu, while siblings have
        // FIXED Validate recursive menu does not work.
        // DONE Add loading menu to non recursive menu
        // DONE not Show empty menu in on maxMf is triggered in normal menu
        // DONE Add Schema to retrieve limited amount of data
        // DONE Recursive child retrieve in 2 time instead of (n)        
        // DONE in overflow menu bottom of page when still not at end of page
        // FIXED Recursive Menu, with empty data keep showing 'loading'
        // DONE validation message should not show in error menu
        // FIXED on click position changes, sometime not placed on right spot, page width still extends
        // DONE Have micro flows as data source 
        // DONE Empty menu caption.
        // 

        postCreate: function () {
            // not shared objects
            this.loadingMenuNode = null;
            this.noMenuItemsNode = null;
            this.childCache = null;
            this.menuNode = null;
            this.selectEntity = this.reference.split("/")[1];
            this.targetReferece = this.reference.split("/")[0];

            //split config reference into entity and reference, for easy access
            for (var i = 0; i < this.menuLevels.length; i++) {
                var rs = this.menuLevels[i].menuReference.split("/");
                this.menuLevels[i].reference = rs[0];
                this.menuLevels[i].entity = rs[1];
            }

            this.renderHtml();
            var valid = this.validateConfig();
            if (valid === true) {
                if (this.prefetch === "onclickOnce" || this.prefetch === "onclick") {
                    this.loadingMenu();
                } else {
                    if (this.recursive === true) {
                        this.menuDataRecursive = [];
                        mendix.lang.sequence(this, [this.loadMenuDataRecursiveChild, this.loadMenuDataRecursiveRoot]); // load child before parents  
                    } else {
                        this.loadMenuData();
                    }
                }
            }
            this.initContext();
            this.actLoaded();
        },

        lazyLoadingMenuData: function () {
            //start loading menu data
            if (this.recursive === true) {
                this.menuDataRecursive = [];
                mendix.lang.sequence(this, [this.loadMenuDataRecursiveChild, this.loadMenuDataRecursiveRoot]); // load child before parents  
            } else {
                this.loadMenuData();
            }
        },

        onSubMenuEnter: function (evt) {
            // open sub menu item, calculate position
            evt.preventDefault();
            evt.stopPropagation();

            var menu = evt.target.parentNode.parentNode;
            dojo.query("*", menu).removeClass('open'); //close others
            var ww = window.innerWidth; // store windwos width before opening.
            dojo.addClass(evt.target.parentNode, 'open');
            var menupos = domGeom.position(evt.target.parentNode);
            var subMenu = dojo.query("ul", evt.target.parentNode)[0];
            var subMenupos = domGeom.position(subMenu);

            if ((subMenupos.x + subMenupos.w) + 30 > ww) {
                if (menupos.x - subMenupos.w > 0)
                    dojo.setStyle(subMenu, "left", -subMenupos.w + "px");
                else
                    dojo.setStyle(subMenu, "left", -menupos.x + 15 + "px");
            }

        },

        validateConfig: function () {
            // Validate the configuration of the widget made in the moddeler 
            if (dojo.version.major === 4) {
                this.showValidationMessage("This widget will not work in Mendix 4");
                throw "Mendix 5 widget in Mendix 4";
            }
            if (this.recursive === true && this.menuLevels.length > 1) {
                this.showValidationMessage("Configuration Error " + this.id + ": A recursive menu can only have one level");
                return false;
            }
            if (this.menuLevels[0].refSourceEntity !== this.selectEntity) {
                this.showValidationMessage("Configuration Error " + this.id + ": The first Menu level " + this.menuLevels[0].refSourceEntity + " should match the entity type of the data source " + this.targetReferece);
                return false;
            }
            for (var i = 0; i < this.menuLevels.length; i++) {
                if (i > 0) {
                    if (this.menuLevels[i].refSourceEntity !== this.menuLevels[i - 1].entity) {
                        this.showValidationMessage("Configuration Error " + this.id + ": The Menu level " + (i + 1) + " are is not matching the previous level. the enty " + this.menuLevels[i].refSourceEntity + " should be equal to " + this.menuLevels[i - 1].entity);
                        return false;
                    }
                }
            }
            return true;
        },

        showValidationMessage: function (msg) {
            dojo.style(this.validationDiv, "display", "block");
            this.validationDiv.innerHTML = msg;
            // mx add also error parent node 
        },
        
        //------ Data retreivel TODO in new file
        loadMenuDataRecursiveChild: function (callback) {
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
        },
        loadMenuDataRecursiveRoot: function (callback) {
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
        },

        buildCacheTable: function (objs) {
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
            if (parentMenu.guid in this.childCache) {
                return this.childCache[parentMenu.guid];
            } else {
                return [];
            }
        },

        // retreive the data of the menu. 
        loadMenuDataRecursive: function (parentMenu) {
            this.cbLoadMenuDataRecursive(parentMenu, this.filter(parentMenu));
        },

        cbLoadMenuDataRecursive: function (parentMenu, objs) {
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
        },

        checkMenuComplete: function () {
            // when complete attach menu to button
            if (!this.rendering && this.checkMenuCompleteRecrusive(this.menuDataRecursive)) {
                this.rendering = true;
                this.appendMenu(this.menuDataRecursive);
            }
        },

        checkMenuCompleteRecrusive: function (menu) {
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
        },

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
        },

        cbLoadMenuDataLeafs: function (level, objs) {
            //fill data of the leafs (selectable entityes)
            var parents = [];
            var o = null;
            for (var i = 0; i < objs.length; i++) {
                o = objs[i];
                if (this.dsMicroflow) {
                    var parentIndex = o.get(this.menuLevels[level].reference)
                } else {
                    var parentIndex = o.get(this.menuLevels[level].reference).guid; 
                }
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
        },

        getParentLevel: function (menuData, level) {
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
        },

        cbLoadMenuDataParents: function (level, menuData, objs) {
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
        },
        // end data retreival TODO new file
        
        appendMenu: function (menuData) {
            // add the menus to the button and appand clear.
            var menu = this.getMenu(menuData);
            if (menuData.length === 0 && this.noMenuItemsCaption !== "") {
                menu.appendChild(this.noMenuItemsMenu());
            }
            if (this.clearText !== "") {
                var $ = mxui.dom.create;
                var clearButton = $("a", {
                    tabindex: "-1",
                    href: "#"
                }, this.clearText, $("button", {
                    type: "button",
                    class: "close"
                }, "x"));

                this.connect(clearButton, 'onmouseenter', dojo.hitch(this, this.closeSubMenus, this.btnGroup));
                this.connect(clearButton, "onclick", dojo.hitch(this, this.onClearSelect));

                menu.appendChild($("li", {
                    class: "divider"
                }));
                var listItem = $("li", {
                    class: "nav-header"
                }, clearButton);
                menu.appendChild(listItem);
            }
            this.btnGroup.appendChild(menu);
            this.menuNode = menu;
            this.dataLoaded = true;
            if (this.prefetch === "onclickOnce" || this.prefetch === "onclick")
                dojo.destroy(this.loadingMenuNode);
        },

        closeSubMenus: function (menu) {
            //close subMenus of main menu.
            dojo.query("*", menu).removeClass('open');
        },

        getMenu: function (menuData) {
            // render the bootstrap drop down menus
            var $ = mxui.dom.create;

            var menu = $("ul", {
                class: "dropdown-menu",
                role: "menu"
            });
            for (var i = 0; i < menuData.length; i++) {
                if (menuData[i].childeren !== null) {
                    var subMenu = this.getMenu(menuData[i].childeren);

                    var subLink = $("a", {
                        tabindex: "-1",
                        href: "#",
                        mxGUID: menuData[i].guid
                    });
                    mxui.dom.html(subLink, menuData[i].label);

                    this.connect(subLink, "onclick", dojo.hitch(this, this.onSubMenuEnter));
                    this.connect(subLink, 'onmouseenter', dojo.hitch(this, this.onSubMenuEnter));
                    this.connect(subLink, "ondblclick", dojo.hitch(this, this.onItemSelect));
                    var listItem = $("li", {
                        role: "presentation",
                        class: "dropdown-submenu"
                    }, subLink, subMenu);

                    menu.appendChild(listItem);

                } else {
                    var subLink = $("a", {
                        href: "#",
                        mxGUID: menuData[i].guid
                    });
                    mxui.dom.html(subLink, menuData[i].label);
                    var listItem = $("li", {
                        role: "presentation"
                    }, subLink);
                    this.connect(subLink, 'onmouseenter', dojo.hitch(this, this.closeSubMenus, menu));
                    this.connect(subLink, "onclick", dojo.hitch(this, this.onItemSelect));
                    menu.appendChild(listItem);
                }
            }
            return menu;
        },

        loadingMenu: function () {
            // create temporary loading menu for lazy loading 
            if (this.loadingMenuNode)
                dojo.destroy(this.loadingMenuNode);

            var $ = mxui.dom.create;

            var node = $("ul", {
                    class: "dropdown-menu",
                    role: "menu"
                },
                $("li", {
                    class: "dropdown-header"
                }, this.loadingText));
            this.loadingMenuNode = node;
            this.btnGroup.appendChild(node);
        },

        noMenuItemsMenu: function () {
            // create temporary loading menu for lazy loading 
            var $ = mxui.dom.create;

            return $("li", {
                class: "dropdown-header"
            }, this.noMenuItemsCaption);
        },

        checkMenuSize: function () {
            // limit the menu size
            this.counterMenuItem++;
            if (this.counterMenuItem >= this.maxMenuItems && this.maxMicroflow) {

                
                if (this.prefetch === "onclickOnce" || this.prefetch === "onclick") 
                    this.execaction(this.maxMicroflow);
                this.loadingMenuNode && dojo.destroy(this.loadingMenuNode);

                return true;
            }
            if (this.counterMenuItem >= this.maxMenuItems && !this.maxMicroflow) {
                this.showValidationMessage("Error loading menu: to many items to display");
                this.errorMenu = true;
                if (this.loadingMenuNode)
                    dojo.destroy(this.loadingMenuNode);
                throw " menu has to many option to display"; // TODO Check alternative for throw Error
                //return false;
            }
            return false;
        },

        execaction: function (mf) {
            // execute MF
            if (mf) {
                mx.data.action({
                    params: {
                        actionname: mf,
                        applyto: "selection",
                        guids: [this.context.getGuid()]
                    },
                    store: {
                        caller: this
                    },
                    callback: function (obj) {},
                    error: function (error) {
                        console.error("Error in execaction: " + error.description);
                    }
                });
            }
        },

        // Mendix function.is this ever used?
        _setDisabledAttr: function (value) {
            this.isDisabled = !!value;
        },

        onItemSelect: function (evt) {
            // a menu item selection handler
            var item = dijit.getEnclosingWidget(evt.target);
            var mxGUID = dojo.getAttr(evt.target, "mxGUID");

            mxGUID && this.context.set(this.targetReferece, mxGUID);

            this.updateButtonLabel();
            this.close();

            action = dojo.hitch(this, this.execaction, this.changeMicroflow);
            action(); //clean up?
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },

        _onClick: function (evt) {
            // Exacute MF on click of a menu item
            action = dojo.hitch(this, this.execaction, this.clickMicroflow);
            action();
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },

        onClearSelect: function (evt) {
            // clear data selection in Mx object and label
            this.context.set(this.targetReferece, "");

            this.updateButtonLabel();
            this.close();
            action = dojo.hitch(this, this.execaction, this.changeMicroflow);
            action();
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },

        renderHtml: function () {
            // connect events and set inital values
            if (this.icon) {
                this.imageNode.src = this.icon;
            } else {
                this.imageNode.style.display = "none";
            }
            mxui.dom.html(this.label, "Button loading");

            this.connect(this.dropDownButton, "onclick", dojo.hitch(this, this.toggle));
            this.connect(this.button, "onclick", dojo.hitch(this, this.execaction, this.clickMicroflow));
            this.connect(document, "click", dojo.hitch(this, this.close));
        },

        toggle: function (e) {
            // toggles the display of the dropdown or call MF if max menu items exceded
            if (this.domIsDisabled()) {
                return false;
            }
            if (this.counterMenuItem < this.maxMenuItems || this.prefetch === "onclick") {
                this.isOpen() ? this.close() : this.open();
            } else {
                var action = dojo.hitch(this, this.execaction, this.maxMicroflow);
                action();
            }
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        },

        open: function () {
            // shows the dropdown. Hides any other displayed dropdowns on the page.
            if (this.domIsDisabled()) {
                return false;
            }
            this.isOpen() || dojo.addClass(this.btnGroup, "open");
            if (this.prefetch === "onclickOnce" && !this.dataLoaded)
                this.lazyLoadingMenuData();
            if (this.prefetch === "onclick") {
                this.rendering = false;
                this.counterMenuItem = 0;
                if (this.validationDiv)
                    dojo.style(this.validationDiv, "display", "none");
                this.menuNode && dojo.destroy(this.menuNode);
                this.loadingMenu();
                this.lazyLoadingMenuData();
            }
            this.shown = true;
        },

        close: function () {
            // hides the dropdown.
            if (this.domIsDisabled()) {
                return false;
            }
            this.isOpen() && dojo.query("*", this.domNode).removeClass('open');
            this.shown = false;
        },

        domIsDisabled: function () {
            // returns whether the dropdown is currently disabled.
            return dojo.hasClass(this.button, "disabled");
        },

        isOpen: function () {
            // returns whether the dropdown icas currently visible.
            return this.shown;
        },

        updateButtonLabel: function () {
            // get the data of the new button label
            if (this.context.get(this.targetReferece) !== "") {
                mx.data.get({
                    guid: this.context.get(this.targetReferece),
                    count: true,
                    callback: dojo.hitch(this, this.callBackUpdateButtonLabel),
                    error: function (error) {
                        console.error("Error in updateButtonLabel: " + error.description);
                    }
                });
            } else {
                this.callBackUpdateButtonLabel(null);
            }
        },

        callBackUpdateButtonLabel: function (mxObject) {
            // update the button label, enable, error mng
            if (this._beingDestroyed || this._destroyed) //need check, bug mendix will do a second refresh resulting destroyed but still active instance
                return;
            var object = dojo.isArray(mxObject) ? mxObject[0] : mxObject;
            var value = "&nbsp";
            if (object && this.displayFormat !== "") {
                value = object.get(this.displayFormat);
            }
            var currentLabel = this.label.innerHTML;
            var newLabel = this.captionText + value;
            if (value === "" && this.emptyCaptionText !== "")
                newLabel = this.captionText + this.emptyCaptionText;
            if (this.displayFormat !== "") {
                if (newLabel !== currentLabel)
                    mxui.dom.html(this.label, newLabel);
            } else {
                if (this.captionText) {
                    mxui.dom.html(this.label, this.captionText);
                } else {
                    mxui.dom.html(this.label, "&nbsp;");
                }
            }
            this.readOnlyBool = true;
            var disableCondition = false;
            if (this.context) {
                this.readOnlyBool = this.context.isReadonlyAttr(this.targetReferece);
                if (this.readonly === "conditional") {
                    disableCondition = !this.context.get(this.readonlyConditional);
                }
            }

            if (this.readOnlyBool === true || this.readonly === true || this.readonly === "true" || this.isDisabled === true || disableCondition === true || !this.context)
                this.isInactive = true;
            else
                this.isInactive = false;
            var disabled = dojo.hasClass(this.button, "disabled");

            if (!disabled && this.isInactive) {
                dojo.addClass(this.button, "disabled");
                dojo.addClass(this.dropDownButton, "disabled");
            } else if (disabled && !this.isInactive) {
                dojo.removeClass(this.button, "disabled");
                dojo.removeClass(this.dropDownButton, "disabled");
            }

            if (this.validationDiv && !this.errorMenu)
                dojo.style(this.validationDiv, "display", "none");
        },

        validationUpdate: function (validations) {
            //Onvalidation error show feedback
            for (var i = 0; i < validations.length; i++) {
                var fields = validations[i].getFields();
                for (var x = 0; x < fields.length; x++) {
                    var field = fields[x];
                    var name = field.name;
                    var reason = field.reason;
                    if (name === this.targetReferece && !this.errorMenu) {
                        validations[i].removeAttribute(this.targetReferece);
                        this.showValidationMessage(reason);
                    }
                }
            }
        },

        applyContext: function (context, callback) {
            // apply context of the object, connect with handlers and set label value
            var trackId = context && context.getTrackId();
            if (trackId) {
                mx.data.get({
                    guid: trackId,
                    error: function () {
                        console.log("Retrieving context object failed.");
                    },
                    callback: dojo.hitch(this, function (context) {
                        this.context = context;
                        //Next line needed? Bug should at least use original entityConstraint.
                        this.entityConstraint = this.entityConstraint.replace('[%CurrentObject%]', trackId);

                        var valid = this.validateConfig();
                        if (valid === true && this.prefetch === "onload") {
                            if (this.recursive === "true" || this.recursive === true) { //mendix 4 and 5 compatible
                                this.menuDataRecursive = [];
                                mendix.lang.sequence(this, [this.loadMenuDataRecursiveChild, this.loadMenuDataRecursiveRoot]); // load child before parents  
                            } else {
                                this.loadMenuData();
                            }
                        } else if (valid === true && (this.prefetch === "onclickOnce" || this.prefetch === "onclick")) {
                            this.loadingMenu();
                        }
                        this.updateButtonLabel();
                        this.handler = mx.data.subscribe({
                            guid: context.getGuid(),
                            callback: dojo.hitch(this, this.updateButtonLabel)
                        });
                        this.handlerReference = mx.data.subscribe({
                            guid: context.getGuid(),
                            attr: this.targetReferece,
                            callback: dojo.hitch(this, this.updateButtonLabel)
                        });
                        this.handlerValidation = mx.data.subscribe({
                            guid: context.getGuid(),
                            val: true,
                            callback: dojo.hitch(this, this.validationUpdate)
                        });
                    })
                });

            } else {
                this.context = null;
                this.callBackUpdateButtonLabel(null);
            }
            callback && callback();
        },

        uninitialize: function () {
            // destroy handlers and generated dom
            mx.data.unsubscribe(this.handler);
            mx.data.unsubscribe(this.handlerValidation);
            mx.data.unsubscribe(this.handlerReference);
            this.domNode && dojo.destroy(this.domNode);
            console.debug(this.id + ".uninitialize");
        }

    };
    mxui.widget.declare('MultiLevelMenu.widget.MultiLevelMenu', MultiLevelMenu);
});