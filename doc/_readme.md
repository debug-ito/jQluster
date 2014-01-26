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
Set `--help` option to see options.


### Get jqluster.js

Get the source code and build jqluster.js

**TODO: use a tag instead of master branch**

    $ git clone https://github.com/debug-ito/jQluster.git
    $ cd jQluster
    $ make

The `make` command generates the file `jqluster-VERSION.js`. `VERSION`
is the version number.

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
<script type="text/javascript" src="jqluster-VERSION.js"></script>
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
prepared. To initialize jQluster in this way, the browser must support
WebSocket.

Web pages that use jQluster are called "nodes", and they are
identified by **Node IDs**. You can access other Web pages (that are
possibly in other browsers on other machines) by specifying their Node
IDs.

The above code declares that the current node can be referred to as
the Node ID `"Alice"` by other jQluster nodes. You can use any string
for a Node ID.

It's a bit tricky to have more than one Web pages share the same Node
ID. See below for details.


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

Note that **the return value of the callback function is ignored.** So
the event is always propagated to upper elements. This is a limitation
of jQluster.


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

### Sharing a Node ID with More than One Pages

It is possible for more than one Web pages to share the same Node ID,
but you should be aware that jQluster cannot distinguish those
individual pages.

Suppose Web pages `a1` and `a2` have the same Node ID `a`. Then, the
basic rules are:

- Setter methods and effect methods to the node `a` affect both `a1` and `a2`.
- Getter methods to the node `a` retrieve a value from either `a1` or `a2`.
- `on()` method to the node `a` sets a callback to both `a1` and `a2`.
  The callback is executed when an event occurs in either `a1` or `a2`.
- A readiness callback for the node `a` is executed every time either
  `a1` or `a2` gets ready.


### Loopback jQluster

jQluster makes it easy to create a Web application that is spread over
multiple screens. However it'd be great if the application could also
be used with a single screen.

To ease creating such a flexible application, jQluster supports a
"loopback" mode.

```javascript
$.jqluster.init("Alice", "loopback");
```

Instead of a WebSocket URL, give `"loopback"` to `$.jqluster.init()`
as the second argument. If jQluster is initialized that way, **every
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

### $.jqluster namespace

```javascript
$.jqluster.init(my_node_id, transport_id, options);
```

Initialize jQluster. You must call this before doing any jQluster
operation. You must not call this more than once in the same Web page.

- `my_node_id` (string): Node ID for this Web page.
- `transport_id` (string): Either a WebSocket URL to the jQluster server or the string `"loopback"`.
- `options` (object): Optional. An object that keeps options.

If `transport_id` is `"loopback"`, jQluster goes into the loopback
mode. Every jQluster operation will be targeted to the page itself.

Currently there is one possible field in `options` object.

- `options.notify` (array): an array of Node IDs that this node notifies of its readiness.


```javascript
$remote_jquery = $.jqluster(node_id);
```

Obtain a remote jQuery object for the given remote node specified by `node_id`.

Return value `$remote_jquery` is a remote jQuery object, which is
similar to `jQuery` but it operates on the remote node.


### Remote jQuery object

```javascript
remote_selector = $remote_jquery(target)
```

Select a set of DOM objects in the remote node by `target`.

Argument `target` accepts the following types.

- A string. It is interpreted as a jQuery CSS selector string.
- The `window` object. Then it returns `$(window)` for the remote node.
- The `document` object. Then it returns `$(document)` for the remote node.
- The `this` object in a remote event listener. Then it returns the
  remote DOM object on which the event occurred. Can be used with
  effects methods, `on()` method and `each()` method of Remote Selector.

Return value `remote_selector` defines some jQuery methods to
operatate on the remote node. See below for detail.


```javascript
$remote_jquery(function($r) { ... });
```

Register a readiness callback function for the remote node.

If the remote node notifies its readiness to this node, the callback
is called when the remote node gets ready.

The argument for the callback is the same object as `$remote_jquery`.

### Remote Selector - Selection Methods

```javascript
new_remote_selector = remote_selector.children();
```


jQuery methods to select/filter DOM objects further. These methods return a new remote selector object.

Some methods (such as `filter`) accepts arguments, but **only string-type arguments are supported.**

- `children`
- `closest`
- `contents`
- `end`
- `eq`
- `filter`
- `find`
- `first`
- `has`
- `is`
- `last`
- `nextAll`
- `nextUntil`
- `next`
- `not`
- `offsetParent`
- `parent`
- `parentsUntil`
- `parents`
- `prevAll`
- `prevUntil`
- `prev`
- `siblings`
- `slice`

### Remote Selector - Accessor Methods

```javascript
remote_selector = remote_selector.css("color", "red");
promise = remote_selector.css("color");
```

jQuery methods to get/set attributes and properties from/to DOM
objects. It also includes methods for DOM manipulation.

Note that **only strings or plain objects are supported as arguments.**
Functions, HTMLElements or jQuery objects are not supported.

Note also that getter methods return a
[jQuery.Promise](http://api.jquery.com/Types/#Promise) object instead
of the actual value. To get the actual value, you must use `then()`
method on the promise.

- `addClass`
- `after`
- `appendTo`
- `append`
- `attr`
- `before`
- `css`
- `data`
- `detach`
- `empty`
- `hasClass`
- `height`
- `html`
- `index`
- `innerHeight`
- `innerWidth`
- `insertAfter`
- `insertBefore`
- `off`
- `offset`
- `outerHeight`
- `outerWidth`
- `position`
- `prependTo`
- `prepend`
- `promise`
- `prop`
- `removeAttr`
- `removeClass`
- `removeProp`
- `remove`
- `replaceAll`
- `replaceWith`
- `scrollLeft`
- `scrollTop`
- `size`
- `text`
- `toggleClass`
- `trigger`
- `unwrap`
- `val`
- `width`
- `wrapAll`
- `wrapInner`
- `wrap`

### Remote Selector - Effects Methods

```javascript
remote_selector.fadeIn(100, function() { ... });
```

jQuery methods for visual effects.

You can pass the callback function as the last argument to these
methods. The callback function is executed every time the effect is
completed for an element.

jQuery supports named arguments
(e.g. `fadeIn({duration: 100, step: function() { ... }})`),
but **it's not supported in jQluster.**

- `animate`
- `fadeIn`
- `fadeOut`
- `fadeTo`
- `fadeToggle`
- `hide`
- `show`
- `slideDown`
- `slideToggle`
- `slideUp`
- `toggle`

### Remote Selector - Other Methods

```javascript
remote_selector.on(events, function(event) { ... });
remote_selector.on(events, selector, function(event) { ... });
remote_selector.on(events, selector, data, function(event) { ... });
```

Set an event handler to the remote node.

In the callback function, you can access the event source by wrapping
`this` object with the remote jQuery, i.e., `$remote_jquery(this)`.

Note that **the return value from the callback function is ignored.**
This means the event is always propagated to the upper elements.


```javascript
remote_selector.each(function(index, elem) { ... })
```

Iterate over the `remote_selector` and executes the given function for
each element in it.

In the callback function, you can access the matched element by wrapping
`this` object with the remote jQuery, i.e., `$remote_jquery(this)`.

This method is more experimental than others. I think it won't work as
you expect when there are more than one pages with the same Node ID.


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

To access data in a remote node, jQluster nodes communicates with each
other over the network.

Currently jQluster uses WebSocket for comminication between nodes. The
communication forms the star topology with a jQluster server being
center.

    [Node "Alice"] --WebSocket-- [Server] --WebSocket-- [Node "Bob"]
                                     |
                                     +-- other nodes...

Over the WebSocket network, jQluster nodes exchange messages with each
other. The messages conform to the jQluster messaging protocol. See
`doc/protocol.md` for details about the protocol.


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

## License

jQluster is provided under the [MIT license](http://opensource.org/licenses/MIT).


## Author

Toshio Ito - https://github.com/debug-ito

