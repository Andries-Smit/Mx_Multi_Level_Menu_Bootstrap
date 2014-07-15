// JSLint options:
/*global dojo, require, mxui, mendix, dijit */
mxui.dom.addCss(require.toUrl("MultiLevelMenu/widget/ui/MulitLevelMenu.css"));
require(["dojo/dom-geometry", "MultiLevelMenu/widget/MenuData"], function (domGeom, menuData) {
    //"use strict";  can not use strict mode due to buildRending: this.inherited(arguments);
    var MultiLevelMenu = {
        mixins: [mendix.addon._Contextable, dijit._TemplatedMixin],
        inputargs: {
            // Appearance
            captionText: "",
            noMenuItemsCaption: "",
            icon: "",
            readonly: false,
            readonlyConditional: "",
            emptyCaptionText: "",
            clearText: "",
            loadingText: "",
            buttonStyle: "default",

            // behaviour
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
            recursive: false,
            menuLevels: [], //{refDsMicroflow}
            refSourceEntity: "",
            menuReference: "",
            labelAttribute: "",
            displayLabel: "",

            //selectable objects
            entityConstraint: "",
            dsMicroflow: "",
            class: ""
        },

        //Caches
        context: null,
        mlMenuButton: null,
        readOnlyBool: false,
        isInactive: false,
        isDisabled: false,
        selectEntity: "",
        targetReferece: "",
        handler: null,
        handlerReference: null,
        handlerValidation: null,
        counterMenuItem: 0,
        errorMenu: false,
        shown: false,
        baseClass: "multiLevelMenu",
        dataLoaded: false,
        loadingMenuNode: null,
        noMenuItemsNode: null,
        menuNode: null,
        dataSource: null,
        
        // templated variable
        domNode: null,
        label: null,
        btnGroup: null,
        imageNode: null,
        dropDownButton: null,
        button: null,
        validationDiv: null,        
        
        
        // Author: Andries Smit
        // Organisation: Flock of Birds
        // Date 15 July 2014
        // Version 2.0
        // 
        // KNOW ISSUES :
        // 
        // TODO: 
        // Make us dojo template attach event
        // Inline-block button and menu button (Will wrap when with is to long.)
        //                
        // OPTIONAL:
        // different buttons: normal, split button, input,   
        // Add key escape event to close menu?  
        // Split into 2 difference widgets : normal and recursive  
        // Navigation header in menu with entity name  <li class="nav-header">Organisation</li>
        // Menu does not close, when other menu is opened, on leave menu close
        // 
        // ADDED drop up and left based on screen position?  http://www.bootply.com/92442  
        // ADDED test with large set of data
        // ADDED make max menu size input parameter
        // ADDED clear with list header and close button <li class="nav-header">List header<button type="button" class="close" data-dismiss="modal" aria-hidden="true">x</button></li>
        // ADDED When max result, have a MF to be clicked to open an alternative.
        // ADDED render clear button as anchor. <a tabindex="-1" href="#">(clear cat)<button type="button" class="close">x</button></a> //css a.clear{ padding-right: 8px};
        // ADDED add divider above clear button  <li role="presentation" class="divider"></li>
        // ADDED make use of dojo template
        // ADDED disabled button looks strange
        // ADDED Bootstrap 3 menu should have presentation role <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>
        // ADDED Lazy Loading
        // ADDED add mf for split button
        // ADDED open submenu onclick too, make it mobile accessible.
        // ADDED close open submenus on hover clear button.
        // ADDED close open submenus when hover over items that have no sub menu, while siblings have
        // FIXED Validate recursive menu does not work.
        // ADDED Add loading menu to non recursive menu
        // ADDED not Show empty menu in on maxMf is triggered in normal menu
        // ADDED Add Schema to retrieve limited amount of data
        // ADDED Recursive child retrieve in 2 time instead of (n)        
        // ADDED in overflow menu bottom of page when still not at end of page
        // FIXED Recursive Menu, with empty data keep showing 'loading'
        // ADDED validation message should not show in error menu
        // FIXED on click position changes, sometime not placed on right spot, page width still extends
        // ADDED Have micro flows as data source 
        // ADDED Empty menu caption.
        // ADDED If button click mf render as Split Button else as normal Button
        // ADDED Split widget into data source and widget file
        // ADDED Timer to close menu on leave
        
        buildRendering: function () {
            // select a templated based on widget settings
            if (this.clickMicroflow === "")
                this.templatePath = require.toUrl("MultiLevelMenu/widget/ui/MultiLevelMenu_button.html");
            else
                this.templatePath = require.toUrl("MultiLevelMenu/widget/ui/MultiLevelMenu_splitButton.html");
            this.inherited(arguments);
        },
        
        postCreate: function () {
            // not shared objects
            this.context = null;
            this.mlMenuButton = null;
            this.handler = null;
            this.handlerReference = null;
            this.handlerValidation = null;
            this.loadingMenuNode = null;
            this.noMenuItemsNode = null;
            this.menuNode = null;
            this.dataSource = null;
        
            this.selectEntity = this.reference.split("/")[1];
            this.targetReferece = this.reference.split("/")[0];
            this.dataSource = new menuData({
                "menuLevels": this.menuLevels,
                "maxMenuItems": this.maxMenuItems,
                "selectEntity": this.selectEntity,
                "entityConstraint": this.entityConstraint,
                "context": this.context,
                "dsMicroflow": this.dsMicroflow,
                "displayLabel": this.displayLabel,
                "menuWidget": this,
                "prefetch": this.prefetch,
                "recursive": this.recursive
            });

            //split config reference into entity and reference, for easy access
            for (var i = 0; i < this.menuLevels.length; i++) {
                var rs = this.menuLevels[i].menuReference.split("/");
                this.menuLevels[i].reference = rs[0];
                this.menuLevels[i].entity = rs[1];
            }

            this.renderHtml();
            this.validateConfig();
            
            this.initContext();
            this.actLoaded();
        },       

        onSubMenuEnter: function (evt) {
            // open sub menu item, calculate position (function was removed from bootstrap
            evt.preventDefault();
            evt.stopPropagation();

            var menu = evt.target.parentNode.parentNode;
            dojo.query("*", menu).removeClass('open'); //close others
            var ww = window.innerWidth; // store windows width before opening.
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
            // Validate the configuration of the widget made in the modeller 
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
            // Show validation message under the menu
            dojo.style(this.validationDiv, "display", "block");
            this.validationDiv.innerHTML = msg;
            // mx add also error parent node ?
        },

        appendMenu: function (menuData) {
            // add the menus to the button and append clear, will be called by data source, when completed
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
                    if(this.parentSelectable)
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

        setLoadingMenu: function () {
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
            // limit the menu size, will be called by the data source.
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
                if(this.isOpen()) this.close();
                return true;
            }
            return false;
        },

        execaction: function (mf) {
            // execute a MF
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
            var mxGUID = dojo.getAttr(evt.target, "mxGUID");

            mxGUID && this.context.set(this.targetReferece, mxGUID);

            this.updateButtonLabel();
            this.close();

            this.execaction(this.changeMicroflow);
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
            this.execaction(this.changeMicroflow);
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },

        renderHtml: function () {
            // connect events and set initial values
            if (this.icon) {
                this.imageNode.src = this.icon;
            } else {
                this.imageNode.style.display = "none";
            }
            mxui.dom.html(this.label, "Button loading");

            this.connect(this.dropDownButton, "onclick", dojo.hitch(this, this.toggle));
            this.button && this.connect(this.button, "onclick", dojo.hitch(this, this.execaction, this.clickMicroflow));   
            this.connect(document, "click", dojo.hitch(this, this.close));
        },

        toggle: function (e) {
            // toggles the display of the dropdown or call MF if max menu items exceeded
            if (this.domIsDisabled()) {
                return false;
            }
            if (this.counterMenuItem < this.maxMenuItems || this.prefetch === "onclick") {
                this.isOpen() ? this.close() : this.open();
            } else {
                this.execaction(this.maxMicroflow);
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
            if (this.prefetch === "onclickOnce" && !this.dataLoaded){ 
                this.setLoadingMenu();
                this.dataSource.loadData();
            }
            if (this.prefetch === "onclick") {
                this.counterMenuItem = 0;
                if (this.validationDiv)
                    dojo.style(this.validationDiv, "display", "none");
                this.menuNode && dojo.destroy(this.menuNode);
                this.setLoadingMenu();
                this.dataSource.loadData();
            }
             this.closeHandler = this.connect(this.domNode, "onmouseleave", dojo.hitch(this, function(){
                this.timer = setTimeout(dojo.hitch(this,function(){
                    this.disconnect(this.closeHandler); 
                    this.disconnect(this.stayOpenHandler); 
                    this.close();}),1000);
            }));
            this.stayOpenHandler = this.connect(this.domNode, "onmouseenter", dojo.hitch(this, function(){
                clearTimeout(this.timer);
            }));
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
            return dojo.hasClass(this.dropDownButton, "disabled");
        },

        isOpen: function () {
            // returns whether the dropdown is currently visible.
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
            // update the button label, enable, error message
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

            if (this.readOnlyBool === true || this.readonly === "true" || this.isDisabled === true || disableCondition === true || !this.context)
                this.isInactive = true;
            else
                this.isInactive = false;
            var disabled = dojo.hasClass(this.dropDownButton, "disabled"); //TODO us function isDomDisab;led

            if (!disabled && this.isInactive) {
                this.button && dojo.addClass(this.button, "disabled");
                dojo.addClass(this.dropDownButton, "disabled");
            } else if (disabled && !this.isInactive) {
                this.button && dojo.removeClass(this.button, "disabled");
                dojo.removeClass(this.dropDownButton, "disabled");
            }

            if (this.validationDiv && !this.errorMenu)
                dojo.style(this.validationDiv, "display", "none");
        },

        validationUpdate: function (validations) {
            // On validation error show feedback
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
                        this.dataSource.context = context;

                        var valid = this.validateConfig();
                        if (valid === true && this.prefetch === "onload") {
                            this.dataSource.loadData();
                            
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
                this.dataSource.context = null;
                
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
})