## Known issue
 - If menu has submenus no scrollbar will be shown.
 - Auto close menu with timer on leave does not work.
 - Overflow of menu in .mx-layoutcontainer-wrapper can be shown by scrolling/resizing. If the scroll bar is in another element the menu does not move.

## TODO
 - Make us dojo template attach event
 - Loop trough each level could be more efficient

### OPTIONAL
 - different buttons: normal, split button, input,
 - Add key escape event to close menu?
 - Split into 2 difference widgets : normal and recursive
 - Navigation header in menu with entity name <li class="nav-header">Organisation</li>
 - Menu does not close, when other menu is opened, on leave menu close

## Changes
 - ADDED drop up and left based on screen position? http://www.bootply.com/92442
 - ADDED test with large set of data
 - ADDED make max menu size input parameter
 - ADDED clear with list header and close button <li class="nav-header">List header<button type="button" class="close" data-dismiss="modal" aria-hidden="true">x</button></li>
 - ADDED When max result, have a MF to be clicked to open an alternative.
 - ADDED render clear button as anchor. <a tabindex="-1" href="#">(clear cat)<button type="button" class="close">x</button></a> //css a.clear{ padding-right: 8px};
 - ADDED add divider above clear button <li role="presentation" class="divider"></li>
 - ADDED make use of dojo template
 - ADDED disabled button looks strange
 - ADDED Bootstrap 3 menu should have presentation role <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Action</a></li>
 - ADDED Lazy Loading
 - ADDED add mf for split button
 - ADDED open submenu onclick too, make it mobile accessible.
 - ADDED close open submenus on hover clear button.
 - ADDED close open submenus when hover over items that have no sub menu, while siblings have
 - FIXED Validate recursive menu does not work.
 - ADDED Add loading menu to non recursive menu
 - ADDED not Show empty menu in on maxMf is triggered in normal menu
 - ADDED Add Schema to retrieve limited amount of data
 - ADDED Recursive child retrieve in 2 time instead of (n)
 - ADDED in overflow menu bottom of page when still not at end of page
 - FIXED Recursive Menu, with empty data keep showing 'loading'
 - ADDED validation message should not show in error menu
 - FIXED on click position changes, sometime not placed on right spot, page width still extends
 - ADDED Have micro flows as data source
 - ADDED Empty menu caption.
 - ADDED If button click mf render as Split Button else as normal Button
 - ADDED Split widget into data source and widget file
 - ADDED Timer to close menu on leave
 - FIXED Inline-block button and menu button (Will wrap when with is to long.)
 - ADDED Moved menu to div in body, so it can overlap pop ups and control bars (thanks to Joost Stapersma)
 - ADDED Scroll in sub menu (that does not have a sub menu)
 - ADDED Filter Search options to limit the list.
 - ADDED Default caption in the xml for translatable strings.
 - FIXED Destroy of menu wrapper, Not destroying the wrapper keeps the menu visible after closing a popup with an open menu.
 - FIXED AMD loading of all dojo modules. (fixes loading issue on MX5.15)
