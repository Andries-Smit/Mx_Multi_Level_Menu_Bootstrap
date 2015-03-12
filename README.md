# Multilevel menu Bootstrap
Author: Andries Smit, Flock of Birds

Type: Widget

Latest Version: 2.0

Package file name: MultiLevelMenu.mpk

## Description

Bootstrap based Multilevel menu. Allowing to select a reference via relation. The menu display entities using relations with other entities or a recursive reference to its own entity.

## Typical usage scenario

* Multilevel category selection L1 > 2L > L3 and create a relation with the context and L3
* Associate a context object to a person. In the menu select first the organization > department > Person

## Features and limitations

* Unlimited level of relations
* Button can have static caption, dynamic caption and image
* Button can be read only based on an attribute
* Supports validation feedback
* Limited to max of 100 results (limit can be set)
* Need to scroll if list is too long

## Installation

See the general instructions under _How to Install._

## Dependencies

* Mendix 5 Environment

## Configuration

See properties

## Properties

* Appearance : How the button is displayed
* Behavior : What happens when you select a menu item
* Data Source: The context attributes to be set.
* Menu: Set the data object and relation in the menu
* Selectable Objects: Limits the Menu items with a constraint

## Source

Source and Sample project at GitHub

Please contribute fixes and extensions at

https://github.com/Andries-Smit/Mx_Multi_Level_Menu_Bootstrap

## Known bugs

* None so far; please let me know when there are any issues or suggestions.
* CSS styling will overflow on the menu, menu looks cut off

Please report any issues at the form at the following topic:

[https://mxforum.mendix.com/questions/5983/App-Store-Widget-Multi-Level-Menu-Bootstrap](https://mxforum.mendix.com/questions/5983/App-Store-Widget-Multi-Level-Menu-Bootstrap)

## Frequently Asked Questions

Ask your question at the Mendix Community [Forum](https://mxforum.mendix.com/)