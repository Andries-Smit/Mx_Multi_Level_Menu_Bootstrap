define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/dom-geometry",
    "MultiLevelMenu/widget/MenuData",
    "dojo/window",
    "dojo/aspect",
    "dijit/form/TextBox",
    "dojo/on",
    "dojo/query",
    "dojo/dom-style",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/NodeList-traverse"
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    domGeom,
    menuData,
    win,
    aspect,
    TextBox,
    on,
    query,
    domStyle,
    domClass,
    lang
) {
    // "use strict"; cannot use strict mode due to buildRending: this.inherited(arguments);
    return declare("MultiLevelMenu.widget.MultiLevelMenu", [_WidgetBase, _TemplatedMixin], {
        // mixins: [mendix.addon._Contextable, dijit._TemplatedMixin],

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
        searchEnabled: false,

        // data source
        entitynote: "",
        reference: "",
        displayFormat: "",

        // menu level
        recursive: false,
        menuLevels: [], // {refDsMicroflow}
        refSourceEntity: "",
        menuReference: "",
        labelAttribute: "",
        displayLabel: "",

        // selectable objects
        entityConstraint: "",
        dsMicroflow: "",
        class: "",

        // Caches
        context: null,
        mlMenuButton: null,
        readOnlyBool: false,
        isInactive: false,
        isDisabled: false,
        selectEntity: "",
        targetReference: "",
        counterMenuItem: 0,
        errorMenu: false,
        shown: false,
        baseClass: "multiLevelMenu",
        dataLoaded: false,
        loadingMenuNode: null,
        noMenuItemsNode: null,
        menuNode: null,
        dataSource: null,
        wrapperNode: null,
        searchInput: null,
        noResultNode: null,

        //handles
        handler: null,
        handlerReference: null,
        handlerValidation: null,
        scrollHandle: null,
        resizeHandle: null,
        scrollTimer: null,
        resizeTimer: null,
        searchTimer: null,

        // template variables
        domNode: null,
        label: null,
        btnGroup: null,
        imageNode: null,
        dropDownButton: null,
        button: null,
        validationDiv: null,

        buildRendering: function () {
            // select a templated based on widget settings
            if (this.clickMicroflow === "") {
                this.templatePath = require.toUrl("MultiLevelMenu/widget/ui/MultiLevelMenu_button.html");
            } else {
                this.templatePath = require.toUrl("MultiLevelMenu/widget/ui/MultiLevelMenu_splitButton.html");
            }
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
            this.scrollHandle = null;
            this.resizeHandle = null;
            this.scrollTimer = null;
            this.resizeTimer = null;
            this.searchInput = null;
            this.selectEntity = this.reference.split("/")[1];
            this.targetReference = this.reference.split("/")[0];
            this.dataSource = new menuData({
                menuLevels: this.menuLevels,
                maxMenuItems: this.maxMenuItems,
                selectEntity: this.selectEntity,
                entityConstraint: this.entityConstraint,
                context: this.context,
                dsMicroflow: this.dsMicroflow,
                displayLabel: this.displayLabel,
                menuWidget: this,
                prefetch: this.prefetch,
                recursive: this.recursive
            });

            //split config reference into entity and reference, for easy access
            for (var i = 0; i < this.menuLevels.length; i++) {
                var rs = this.menuLevels[i].menuReference.split("/");
                this.menuLevels[i].reference = rs[0];
                this.menuLevels[i].entity = rs[1];
            }

            this.renderHtml();
            this.validateConfig();

            // this.initContext();
            // this.actLoaded();
        },

        onSubMenuEnter: function (evt) {
            // open sub menu item, calculate position (function was removed from bootstrap
            evt.preventDefault();
            evt.stopPropagation();

            var menu = evt.target.parentNode.parentNode;
            query("*", menu).removeClass("open"); //close others
            var ww = window.innerWidth; // store windows width before opening.
            domClass.add(evt.target.parentNode, "open");
            var menupos = domGeom.position(evt.target.parentNode);
            var subMenu = query("ul", evt.target.parentNode)[0];
            var subMenupos = domGeom.position(subMenu);

            if (subMenupos.x + subMenupos.w + 30 > ww) {
                if (menupos.x - subMenupos.w > 0) {
                    dojo.setStyle(subMenu, "left", -subMenupos.w + "px");
                } else {
                    dojo.setStyle(subMenu, "left", -menupos.x + 15 + "px");
                }
            }

            dojo.setStyle(subMenu, "top", "0px"); // reset top

            var winh = win.getBox().h;
            if (winh < subMenupos.y + subMenupos.h) {
                if (winh > subMenupos.h + 10) {
                    dojo.setStyle(subMenu, "top", winh - (subMenupos.y + subMenupos.h) - 10 + "px");
                } else {
                    dojo.setStyle(subMenu, "top", -winh + "px");
                }
            }
        },

        validateConfig: function () {
            // Validate the configuration of the widget made in the modeller
            if (this.parentSelectable && this.recursive === false) {
                console.warn(
                    "Mulitlevel Menu; setting Parent Selectable can only be used in combination with the recursive menu"
                );
                this.parentSelectable = false; // need to set to false for search function
            }

            if (this.recursive === true && this.menuLevels.length > 1) {
                this.showValidationMessage(
                    "Configuration Error " + this.id + ": A recursive menu can only have one level"
                );
                return false;
            }
            if (this.menuLevels[0].refSourceEntity !== this.selectEntity) {
                this.showValidationMessage(
                    "Configuration Error " +
                        this.id +
                        ": The first Menu level " +
                        this.menuLevels[0].refSourceEntity +
                        " should match the entity type of the data source " +
                        this.targetReference
                );
                return false;
            }
            for (var i = 0; i < this.menuLevels.length; i++) {
                if (i > 0) {
                    if (this.menuLevels[i].refSourceEntity !== this.menuLevels[i - 1].entity) {
                        this.showValidationMessage(
                            "Configuration Error " +
                                this.id +
                                ": The Menu level " +
                                (i + 1) +
                                " are is not matching the previous level. the entity " +
                                this.menuLevels[i].refSourceEntity +
                                " should be equal to " +
                                this.menuLevels[i - 1].entity
                        );
                        return false;
                    }
                }
            }
            return true;
        },

        showValidationMessage: function (msg) {
            // Show validation message under the menu
            domStyle.set(this.validationDiv, "display", "block");
            this.validationDiv.innerHTML = msg;
            // mx add also error parent node ?
        },

        appendMenu: function (data) {
            // add the menus to the button and append clear, will be called by data source, when completed
            var menu = this.getMenu(data);

            var $ = mxui.dom.create;
            if (this.searchEnabled) {
                this.searchInput = new TextBox({
                    name: "menuSearch",
                    class: "searchInput",
                    onClick: function (e) {
                        dojo.stopEvent(e);
                    },
                    onKeyUp: lang.hitch(this, function () {
                        // timer on update for better performance
                        if (this.scrollTimer) clearTimeout(this.searchTimer);
                        this.searchTimer = setTimeout(lang.hitch(this, this.filterList, menu), 50);
                    })
                });

                var filter = $("form", { class: "filterform" }, this.searchInput.domNode);
                dojo.place(filter, menu, "first");
                this.noResultNode = $("li", { class: "no-result hidden", role: "presentation" }, this.noResultCaption);
                menu.appendChild(this.noResultNode);
            }

            if (this.clearText !== "") {
                var clearButton = $(
                    "a",
                    {
                        tabindex: "-1",
                        href: "#"
                    },
                    this.clearText,
                    $(
                        "button",
                        {
                            type: "button",
                            class: "close"
                        },
                        "x"
                    )
                );

                this.connect(clearButton, "onmouseenter", lang.hitch(this, this.closeSubMenus, this.btnGroup));
                this.connect(clearButton, "onclick", lang.hitch(this, this.onClearSelect));

                menu.appendChild(
                    $("li", {
                        class: "divider"
                    })
                );
                var listItem = $(
                    "li",
                    {
                        class: "nav-header clearSelection"
                    },
                    clearButton
                );
                menu.appendChild(listItem);
            }

            this.menuNode = menu;
            this.dataLoaded = true;
            if (this.prefetch === "onclickOnce" || this.prefetch === "onclick") dojo.destroy(this.loadingMenuNode);

            // Create wrapper node containing the ul with the menu data
            if (this.wrapperNode) dojo.destroy(this.wrapperNode);

            this.wrapperNode = $("div", {
                class: "mlMenuDataContainer"
            });
            this.wrapperNode.appendChild(menu);

            //calculate wrapper node position and append to body
            document.body.appendChild(this.wrapperNode);
            this.positionDropdown(this.wrapperNode);
            if (this.searchInput) {
                this.searchInput.focus();
            }
        },

        filterList: function (menu) {
            this.closeSubMenus(menu);
            var value = this.searchInput.get("value").toLowerCase().replace(/['"]+/g, "");
            if (value) {
                // find all (data) items that do not match the value, exclude the standard menu items, and hide them.
                var cssFilter =
                    'li:not(.hidden):not(.no-result):not(.divider):not(.clearSelection) > a:not(a[search-data*="' +
                    value +
                    '"])';
                // filter only on submenus when parents are selectable
                if (!this.parentSelectable) cssFilter += ":not(.subMenu)";
                var list = query(cssFilter, menu);
                list.parent().addClass("hidden");
                // find all items that match and show them (unhide)
                cssFilter = 'li.hidden > a[search-data*="' + value + '"]';
                list = query(cssFilter, menu);
                list.parent().removeClass("hidden");
                var parentSelectable = this.parentSelectable;
                for (var i = 0; i < 5; i++) {
                    // TODO loop trough each level could be more efficient
                    // Check for each submenu if it should be shown
                    list = query(".dropdown-submenu", menu).forEach(function (subMenuNode) {
                        // find submenu has item that are not hidden.
                        var subItemsVis = query("li:not(.hidden)", subMenuNode);
                        if (subItemsVis.length > 0) {
                            // has items, so show
                            domClass.remove(subMenuNode, "hidden");
                            if (parentSelectable) {
                                domClass.remove(subMenuNode, "hidden-submenu");
                            }
                        } else {
                            if (parentSelectable) {
                                // this is sub menu selectable but has no sub menu items, so hide only the sub menu
                                domClass.add(subMenuNode, "hidden-submenu");
                            } else {
                                // sub menu is not selectable and has not children, so should be hidden
                                domClass.add(subMenuNode, "hidden");
                            }
                        }
                    });
                }
                // find if there are still some items left after the search
                list = query(">li:not(.hidden):not(.no-result):not(.divider):not(.clearSelection)", menu);

                if (list.length === 0) domClass.remove(this.noResultNode, "hidden");
                else domClass.add(this.noResultNode, "hidden");
            } else {
                // no search, so remove all classes to make them hidden.
                query("li.hidden", menu).removeClass("hidden");
                query("li.hidden-submenu", menu).removeClass("hidden-submenu");
                domClass.add(this.noResultNode, "hidden");
            }
        },

        positionDropdown: function (node) {
            if (this.shown === true) {
                if (!this.scrollHandle) {
                    var panel = query(this.domNode).closest(".mx-layoutcontainer-wrapper");
                    if (panel.length > 0) {
                        this.scrollHandle = on(
                            panel,
                            "scroll",
                            lang.hitch(this, function () {
                                // timer on update for better performance
                                if (this.scrollTimer) clearTimeout(this.scrollTimer);
                                this.scrollTimer = setTimeout(
                                    lang.hitch(this, this.positionDropdown, this.wrapperNode),
                                    50
                                );
                            })
                        );
                    }
                }
                if (!this.resizeHandle) {
                    var panel2 = query(this.domNode).closest(".mx-layoutcontainer-wrapper");
                    if (panel2.length > 0) {
                        this.resizeHandle = aspect.after(
                            this.mxform,
                            "resize",
                            lang.hitch(this, function () {
                                if (this.resizeTimer) clearTimeout(this.resizeTimer);
                                this.resizeTimer = setTimeout(
                                    lang.hitch(this, this.positionDropdown, this.wrapperNode),
                                    50
                                );
                            })
                        );
                    }
                }
            } else {
                if (this.scrollHandle) {
                    this.scrollHandle.remove();
                }
                if (this.resizeHandle) {
                    this.resizeHandle.remove();
                }
            }
            if (node && this.shown === true) {
                domClass.add(node, "open");
            }
            if (this.btnGroup) {
                // positions the wrapper node relative to button
                var btnPos = domGeom.position(this.btnGroup);

                dojo.setStyle(node, "left", btnPos.x + "px");
                dojo.setStyle(node, "top", btnPos.y + btnPos.h + "px");
                if (node.firstChild) {
                    var menupos = domGeom.position(node.firstChild),
                        winh = win.getBox().h;
                    if (this.elementInView(this.btnGroup)) {
                        if (winh < menupos.y + menupos.h) {
                            dojo.setStyle(node, "left", btnPos.x + 10 + "px");
                            if (winh > menupos.h + 10) dojo.setStyle(node, "top", winh - menupos.h - 20 + "px");
                            else dojo.setStyle(node, "top", 0 + "px");
                        }
                    } else {
                        if (winh < menupos.y + menupos.h) {
                            dojo.setStyle(node, "left", btnPos.x + 10 + "px");
                            dojo.setStyle(node, "top", btnPos.y - menupos.h + "px");
                        }
                    }
                }
            }
        },

        closeSubMenus: function (menu) {
            // close subMenus of main menu.
            query("*", menu).removeClass("open");
        },

        getMenu: function (menuData2) {
            // render the bootstrap drop down menus
            var $ = mxui.dom.create;

            var menu = $("ul", {
                class: "dropdown-menu",
                role: "menu"
            });
            var hasSubmenu = false;
            for (var i = 0; i < menuData2.length; i++) {
                if (menuData2[i].children !== null) {
                    hasSubmenu = true;
                    var subMenu = this.getMenu(menuData2[i].children);

                    var subLink = $("a", {
                        tabindex: "-1",
                        href: "#",
                        mxGUID: menuData2[i].guid,
                        class: "subMenu",
                        "search-data": menuData2[i].label.toLowerCase().replace(/['"]+/g, "")
                    });
                    mxui.dom.html(subLink, menuData2[i].label);

                    this.connect(subLink, "onclick", lang.hitch(this, this.onSubMenuEnter));
                    this.connect(subLink, "onmouseenter", lang.hitch(this, this.onSubMenuEnter));
                    if (this.parentSelectable) {
                        this.connect(subLink, "ondblclick", lang.hitch(this, this.onItemSelect));
                        this.connect(
                            subLink,
                            "onclick",
                            lang.hitch(
                                this,
                                function (link, e) {
                                    if (dojo.hasClass(link.parentNode, "hidden-submenu")) {
                                        // in search mode the parent can be selected with a single click.
                                        this.onItemSelect(e);
                                        dojo.stopEvent(e);
                                    }
                                },
                                subLink
                            )
                        );
                    }
                    var listItem = $(
                        "li",
                        {
                            role: "presentation",
                            class: "dropdown-submenu"
                        },
                        subLink,
                        subMenu
                    );

                    menu.appendChild(listItem);
                } else {
                    var subLink2 = $("a", {
                        href: "#",
                        mxGUID: menuData2[i].guid,
                        "search-data": menuData2[i].label.toLowerCase().replace(/['"]+/g, "")
                    });
                    mxui.dom.html(subLink2, menuData2[i].label);
                    var listItem2 = $(
                        "li",
                        {
                            role: "presentation"
                        },
                        subLink2
                    );
                    this.connect(subLink2, "onmouseenter", lang.hitch(this, this.closeSubMenus, menu));
                    this.connect(subLink2, "onclick", lang.hitch(this, this.onItemSelect));
                    menu.appendChild(listItem2);
                }
            }
            if (!hasSubmenu) {
                domClass.add(menu, "scrollable-menu");
            }
            if (menuData2.length === 0 && this.noMenuItemsCaption !== "") {
                menu.appendChild(this.noMenuItemsMenu());
            }
            return menu;
        },

        setLoadingMenu: function () {
            // create temporary loading menu for lazy loading
            if (this.loadingMenuNode) dojo.destroy(this.loadingMenuNode);

            var $ = mxui.dom.create;

            var node = $(
                "ul",
                {
                    class: "dropdown-menu",
                    role: "menu"
                },
                $(
                    "li",
                    {
                        class: "dropdown-header"
                    },
                    this.loadingText
                )
            );
            this.loadingMenuNode = node;
            this.btnGroup.appendChild(node);
        },

        noMenuItemsMenu: function () {
            // create temporary loading menu for lazy loading
            var $ = mxui.dom.create;

            return $(
                "li",
                {
                    class: "dropdown-header"
                },
                this.noMenuItemsCaption
            );
        },

        checkMenuSize: function () {
            // limit the menu size, will be called by the data source.
            this.counterMenuItem++;
            if (this.counterMenuItem >= this.maxMenuItems && this.maxMicroflow) {
                if (this.prefetch === "onclickOnce" || this.prefetch === "onclick") this.execution(this.maxMicroflow);
                if (this.loadingMenuNode) {
                    dojo.destroy(this.loadingMenuNode);
                }

                return true;
            }
            if (this.counterMenuItem >= this.maxMenuItems && !this.maxMicroflow) {
                this.showValidationMessage("Error loading menu: to many items to display");
                this.errorMenu = true;
                if (this.loadingMenuNode) dojo.destroy(this.loadingMenuNode);
                if (this.isOpen()) this.close();
                return true;
            }
            return false;
        },

        execution: function (mf) {
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
                    callback: function () {},
                    error: function (error) {
                        console.error("Error in execution: " + error.description);
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

            if (mxGUID) {
                this.context.set(this.targetReference, mxGUID);
            }
            this.updateButtonLabel();
            this.close();

            this.execution(this.changeMicroflow);
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }
        },

        onClearSelect: function (evt) {
            // clear data selection in Mx object and label
            this.context.set(this.targetReference, "");

            this.updateButtonLabel();
            this.close();
            this.execution(this.changeMicroflow);
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

            this.connect(this.dropDownButton, "onclick", lang.hitch(this, this.toggle));
            if (this.button) {
                this.connect(this.button, "onclick", lang.hitch(this, this.execution, this.clickMicroflow));
            }
            this.connect(document, "click", lang.hitch(this, this.close));
        },

        toggle: function (e) {
            // toggles the display of the dropdown or call MF if max menu items exceeded
            if (this.domIsDisabled()) {
                return;
            }
            if (this.counterMenuItem < this.maxMenuItems || this.prefetch === "onclick") {
                if (this.isOpen()) {
                    this.close();
                } else {
                    this.open();
                }
            } else {
                this.execution(this.maxMicroflow);
            }
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        },

        open: function () {
            // shows the dropdown. Hides any other displayed dropdowns on the page.
            if (this.domIsDisabled()) {
                return;
            }
            if (!this.isOpen()) {
                domClass.add(this.btnGroup, "open");
            }
            if (this.prefetch === "onclickOnce" && !this.dataLoaded) {
                this.setLoadingMenu();
                this.dataSource.loadData();
            }
            if (this.prefetch === "onclick") {
                this.counterMenuItem = 0;
                if (this.validationDiv) domStyle.set(this.validationDiv, "display", "none");
                if (this.menuNode) dojo.destroy(this.menuNode);
                this.setLoadingMenu();
                this.dataSource.loadData();
            }

            this.shown = true;
            if (this.wrapperNode) {
                // TODO close time out does not work anymore
                this.stayOpenHandler = this.connect(
                    this.domNode,
                    "onmouseenter",
                    lang.hitch(this, function () {
                        clearTimeout(this.timer);
                    })
                );
                this.closeHandler = this.connect(
                    this.wrapperNode.firstChild,
                    "onblur",
                    lang.hitch(this, function () {
                        this.timer = setTimeout(
                            lang.hitch(this, function () {
                                this.disconnect(this.closeHandler);
                                this.disconnect(this.stayOpenHandler);
                                this.close();
                            }),
                            1000
                        );
                    })
                );
                this.positionDropdown(this.wrapperNode);
            }
            if (this.searchInput) this.searchInput.focus();
        },

        elementInView: function (el) {
            var rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <=
                    (window.innerHeight || document.documentElement.clientHeight) /*or $(window).height() */ &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
            );
        },

        close: function () {
            // hides the dropdown.
            if (this.domIsDisabled()) {
                return;
            }
            if (this.isOpen()) {
                query("*", this.domNode).removeClass("open");
                if (this.wrapperNode) {
                    domClass.remove(this.wrapperNode, "open");
                    query("*", this.wrapperNode).removeClass("open");
                }
            }
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
            if (this.context.get(this.targetReference) !== "") {
                mx.data.get({
                    guid: this.context.get(this.targetReference),
                    count: true,
                    callback: lang.hitch(this, this.callBackUpdateButtonLabel),
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
            if (this._beingDestroyed || this._destroyed) {
                // need check, bug mendix will do a second refresh resulting destroyed but still active instance
                return;
            }
            var object = dojo.isArray(mxObject) ? mxObject[0] : mxObject;
            var value = "&nbsp";
            if (object && this.displayFormat !== "") {
                value = object.get(this.displayFormat);
            }
            var currentLabel = this.label.innerHTML;
            var newLabel = this.captionText + value;
            if (value === "&nbsp") newLabel = this.captionText + this.emptyCaptionText;
            if (this.displayFormat !== "") {
                if (newLabel !== currentLabel) mxui.dom.html(this.label, newLabel);
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
                this.readOnlyBool = this.context.isReadonlyAttr(this.targetReference);
                if (this.readonly === "conditional") {
                    disableCondition = !this.context.get(this.readonlyConditional);
                }
            }

            if (
                this.readOnlyBool === true ||
                this.readonly === "true" ||
                this.isDisabled === true ||
                disableCondition === true ||
                !this.context
            ) {
                this.isInactive = true;
            } else {
                this.isInactive = false;
            }
            var disabled = dojo.hasClass(this.dropDownButton, "disabled"); // TODO us function isDomDisabled

            if (!disabled && this.isInactive) {
                if (this.button) domClass.add(this.button, "disabled");
                domClass.add(this.dropDownButton, "disabled");
            } else if (disabled && !this.isInactive) {
                if (this.button) domClass.remove(this.button, "disabled");
                domClass.remove(this.dropDownButton, "disabled");
            }

            if (this.validationDiv && !this.errorMenu) domStyle.set(this.validationDiv, "display", "none");
        },

        validationUpdate: function (validations) {
            // On validation error show feedback
            for (var i = 0; i < validations.length; i++) {
                var fields = validations[i].getFields();
                for (var x = 0; x < fields.length; x++) {
                    var field = fields[x];
                    var name = field.name;
                    var reason = field.reason;
                    if (name === this.targetReference && !this.errorMenu) {
                        validations[i].removeAttribute(this.targetReference);
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
                    callback: lang.hitch(this, function (context2) {
                        this.context = context2;
                        this.dataSource.context = context2;

                        var valid = this.validateConfig();
                        if (valid === true && this.prefetch === "onload") {
                            this.dataSource.loadData();
                        }
                        this.updateButtonLabel();
                        this.handler = mx.data.subscribe({
                            guid: context2.getGuid(),
                            callback: lang.hitch(this, this.updateButtonLabel)
                        });
                        this.handlerReference = mx.data.subscribe({
                            guid: context2.getGuid(),
                            attr: this.targetReference,
                            callback: lang.hitch(this, this.updateButtonLabel)
                        });
                        this.handlerValidation = mx.data.subscribe({
                            guid: context2.getGuid(),
                            val: true,
                            callback: lang.hitch(this, this.validationUpdate)
                        });
                    })
                });
            } else {
                this.context = null;
                this.dataSource.context = null;

                this.callBackUpdateButtonLabel(null);
            }
            if (callback) callback();
        },

        uninitialize: function () {
            // destroy handlers and generated dom
            mx.data.unsubscribe(this.handler);
            mx.data.unsubscribe(this.handlerValidation);
            mx.data.unsubscribe(this.handlerReference);
            if (this.domNode) dojo.destroy(this.domNode);
            if (this.wrapperNode) dojo.destroy(this.wrapperNode);
            console.debug(this.id + ".uninitialize");
        }
    });
});

require(["MultiLevelMenu/widget/MultiLevelMenu"]);
