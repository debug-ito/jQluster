
# jQluster - jQuery to remote browsers

jQluster is a jQuery plugin that manipulates DOM objects and events in
**other browsers**.

With jQluster, you can

- Get data from DOM objects in other browsers.
- Set data to DOM objects in other browsers.
- Listen to events at DOM objects in other browsers.
- Trigger events at DOM objects in other browsers.
- Perform above operations via almost the same API as jQuery's.

Are you wondering why you need this, or why I created this? See the
"Motivation" section below.


## Caveat

**DO NOT USE THIS PLUGIN at Web pages with sensitive information**. 

This plugin is very much **experimental**, and as you can imagine from
the above description, this plugin is **potentially dangerous**.

When you use it, always try to isolate remote node IDs. Remember that
if a jQluster node "Alice" knows another node's ID "Bob", Alice can
always manipulate Bob's DOM objects.


## Demo


## Getting Started

(how to build jQluster, how to set up jQluster server)

## jQluster Tutorial

(how to use jQluster in JavaScript code. Prerequisites.
 - init
 - remote jQuery
 - remote selector
 - setters
 - getters (returning promise)
 - remote event handlers
 - readiness notification
 - loopback transport )

## jQluster API Reference

(detailed API and limitations)


## Motivation

Because Web browsers are everywhere, in every form.

Web browsers are so everywhere that it's not unusual that we have more
than one of them at hand. They are in your PCs, smart phones and
tablets. Some TVs have Web browsers, too. It's like every visible
screens may be equipped with Web browsers in the future.

If they are so pervasive, why don't we use them all at once?

I'm thinking of **multi-screen Web applications**, in which different
Web browsers on different screens work together to create a **single
application**. With multiple screens they may provide unique user
experience that is never possible by conventional single screen
applications.

In multi-screen Web applications, the screens have to communicate with
each other to make a single consistent app. However, communication
between browsers is tough work. We need transport, signaling
mechanisms, messaging protocols and high-level API. It's ridiculous to
re-invent those kinds of stuff over and over.

That is where jQluster comes in handy. jQluster hides those stuff
under high-level API that is very similar to jQuery's. I guess you are
familiar with jQuery API, right? If you are, it's a piece of cake to
create multi-screen Web applications with jQluster.



## Author

Toshio Ito - https://github.com/debug-ito

