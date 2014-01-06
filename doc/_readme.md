# jQluster - jQuery to remote browsers

**I'm still working on this project. Nothing is stable. Everything may be changed and be broken sometimes. It lacks documentation.**


jQluster is a jQuery plugin that manipulates DOM objects and events in
**other browsers**.

With jQluster, you can

- Get data from DOM objects in other browsers.
- Set data to DOM objects in other browsers.
- Listen to events at DOM objects in other browsers.
- Trigger events at DOM objects in other browsers.
- Perform the above operations via almost the same API as jQuery's.

Are you wondering why you need this, or why I created this? See the
"Motivation" section below.


## Caveat

**DO NOT USE THIS PLUGIN at Web pages with sensitive information**. 

This plugin is very much **experimental**, and as you can imagine from
the above description, this plugin is **potentially dangerous**.

When you use it, always try to isolate Node IDs. Remember that if a
jQluster node "Alice" knows another node's ID "Bob", Alice can always
manipulate Bob's DOM objects.


## Demo

TODO

## Getting Started

Before you start using jQluster in your Web site, you have to do the
following steps to prepare jQluster.


### Prepare the Server

Currently jQluster needs a server that accepts/delivers messages
from/to Web browsers.

A server implementation is available as a Perl module called
[jQluster::Server::WebSocket](https://metacpan.org/release/jQluster-Server-WebSocket). You
can install it by

    # wget http://cpanmin.us/ -O- | perl - jQluster::Server::WebSocket

or if you already have `cpanm` installed, you can use

    # cpanm jQluster::Server::WebSocket

Installation may take a few minutes because it may install some other
Perl modules.

After that, start the server by

    $ jqluster_server_websocket

It listens to TCP port 5000 by default.


### Get jqluster.js

Get the source code and build jqluster.js

**TODO: use a tag instead of master branch**

    $ git clone https://github.com/debug-ito/jQluster.git
    $ cd jQluster
    $ make

The `make` command generates the file `jqluster.js`.

### Load jqluster.js with Prerequisites

jQluster depends on the following external packages.

- [jQuery](http://jquery.com/)
- [jQuery XPath plugin](https://github.com/ilinsky/jquery-xpath)
- [ellocate.js](https://github.com/bimech/ellocate.js)

To use jQluster in your Web page, the page HTML must load
`jqluster.js` after the above prerequisites.

```html
<script type="text/javascript" src="jquery.js"></script>
<script type="text/javascript" src="jquery.xpath.js"></script>
<script type="text/javascript" src="ellocate.js"></script>
<script type="text/javascript" src="jqluster.js"></script>
```

After that, you are ready to write jQluster code.


## Using jQluster

Below is the step-by-step guide to use jQluster in JavaScript code.

### Initialization

To use jQluster in your code, you have to initialize it first.

```javascript
$.jqluster.init("Alice", "ws://localhost:5000/");
```

The first argument, `"Alice"`, is the **Node ID** of this page. The
second argument is the WebSocket URL to the jQluster server you
prepared.

Web pages that use jQluster are called "nodes", and they are
identified by **Node IDs**. You can access other Web pages (that are
possibly on other browsers on other machines) by specifying their Node
IDs.

The above code declares that the current node can be referred to as
the Node ID `"Alice"` by other jQluster nodes. You can use any string
for a Node ID.

It's a bit tricky to have more than one Web pages share the same Node
ID. Maybe you should avoid that.


### Remote jQuery

To access another jQluster node, obtain its **remote jQuery** object
first.

```javascript
var $bob = $.jqluster("Bob");
```

The above code obtains the remote jQuery object for the node named
`"Bob"`.

A **remote jQuery** is similar to the `jQuery` object except that it
operates on a remote node. You can use `$bob` just like you use `$`:

```javascript
$bob("ul.hoge").children("li.foo").find("span").css("color", "red");
```

The above code is equivalent to running the following code on the node "Bob".

```javascript
$("ul.hoge").children("li.foo").find("span").css("color", "red");
```

Easy, isn't it? See below for the full list of jQuery methods
supported.

Note that in the above example the jQluster node "Bob" must already be
initialized. You can ensure that using readiness callbacks (see
below).


### Getter Methods

Some jQuery methods return values associated with the selected DOM
objects. For example,

```javascript
var box_width = $("#some-box").width();
```

this fetches the width of the specified box.

jQluster supports this kind of getter methods, but it returns a
[jQuery.Promise](http://api.jquery.com/Types/#Promise) object instead
of the actual value.

```javascript
var box_width_promise = $bob("#some-box").width();
```

To obtain the actual width of the box, you have to call `then()`
method on the promise.

```javascript
box_width_promise.then(function(box_width) {
    console.log("Width is " + box_width);
});
```

This is because the operation on `$bob` may involve communication over
the network that takes some time.

Communication over the network may fail in some unfortunate
situations, so you should get ready for it.

```javascript
box_width_promise.then(function(box_width) {
    console.log("Width is " + box_width);
}, function(error) {
    console.error("jQluster getter method error: " + error);
});
```

To use getter methods, you should be familiar with the concept of
Promises. Sometimes they are called "Deferreds" or "Futures" in other
contexts.


### Remote Event Listeners

jQluster supports `on()` method.

```javascript
$bob(".some-button").on("click", function(event) {
    $bob(this).val("Clicked!");
});
```

Like jQuery's `on()` method, you can wrap the context object (`this`)
with the remote jQuery (`$bob`) to access the remote DOM object on
which the event occurred.

Note that **the return value from the callback function is ignored.**
So the event is always propagated to upper elements. This is a
limitation of jQluster.


### Readiness Notification and Callbacks

With jQuery, you can register a callback function that is called when
the page is ready.

```javascript
$(function() {
    console.log("This page is ready.");
});
```

Similarly jQluster supports a callback that is called when a remote
node is ready for jQluster operations.

```javascript
// In Alice
$bob(function() {
    console.log("This is executed when the node Bob is ready.");
});
```

However, to have the callback actually executed, **the node Bob must
explicitly notify the node Alice of its readiness.** This is done by
passing an option to `$.jqluster.init()` method.

```javascript
// In Bob
$.jqluster.init("Bob", "ws://localhost:5000/", { notify: ["Alice"] });
```

The `notify` option tells jQluster to notify the node Alice when it's
ready for jQluster.

Note that the readiness callback registered in Alice can be executed
more than once. This happens when the node Bob is loaded by more than
one browsers, or it is reloaded.


### Loopback jQluster

jQluster makes it easy to create a Web application that is spread over
multiple screens. However it'd be great if the application could also
be used with a single screen.

To ease creating such a flexible application, jQluster supports a
"loopback" mode.

```javascript
$.jqluster.init("Alice", "loopback");
```

Instead of a WebSocket URL, give `"loopback"` as the second argument
for `$.jqluster.init()`. If jQluster is initialized that way, **every
jQluster operation is targeted to itself.**

```javascript
$.jqluster.init(
    "Alice",
    is_multi_screen_mode ? "ws://localhost:5000/" : "loopback"
);

var $bob = $.jqluster("Bob");
$bob("#some-button").trigger("click");
```

If `is_multi_screen_mode == false` in the above example, the
operation to `$bob` is actually targeted to Alice.

So if you organize your Web application carefully, you can quickly
switch between the multi-screen and single-screen modes by simply
modifying invocation of `$.jqluster.init()` method.



## jQluster API Reference

(detailed API and limitations)

### jQluster internal APIs

If you want to see internal APIs, you can generate the documentation by

    $ make doc

Then open `doc/api/index.html`.

Note that you need [jsdoc](https://github.com/jsdoc3/jsdoc) to
generate the API doc. To install jsdoc,

1. Install [node.js](http://nodejs.org/).
2. Install [npm](https://npmjs.org/).
3. Install jsdoc by

        # npm install -g jsdoc

## Behind the Scene

(how jQluster works. pointer to protocol.md)

## Motivation

I wrote jQluster because Web browsers are everywhere, in every form.

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

