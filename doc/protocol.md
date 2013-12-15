# jQluster Messaging Protocol

Introduction. TODO.

## Basics

TODO. (common message fields including `body.in_reply_to`)

## Server's Role

## Message Types

### register

    {"message_id": ID, "message_type": "register",
     "from": "Alice", "to": null,
     "body": { "node_id": "Alice" } }

**TODO: body.node_id is not necessary. Modify the server implementation, too.**

`register` message is sent from a node to the server. It's a request to register the node with the server. As such, the `to` field is `null`, meaning it's to the server.

### register_reply

    {"message_id": ID, "message_type": "register_reply",
     "from": null, "to": "Alice",
     "body": { "error": null, "in_reply_to": REGISTER_ID }}

`register_reply` message is sent as a response to `register`. As such, `to` field is `null`, meaning it's from the server.

If the registration succeeds, `body.error` field is `null`. Otherwise it contains the reason of the error.

### select_and_get

    {"message_id": ID, "message_type": "select_and_get",
     "from": "Alice", "to": "Bob",
     "body": { "eval_code": CODE, "node_id": "Bob" }}

**TODO: body.node_id is not necessary**

`select_and_get` message tells a remote node ("Bob") to execute some operation and report back its result.

Currently `body.eval_code` is a JavaScript string that is evaluated by the remote node.

Note that this message type may be deprecated in the future because evaluating arbitrary code (`body.eval_code`) is dangerous.

### select_and_get_reply

    {"message_id": ID, "message_type": "select_and_get_reply",
     "from": "Bob", "to": "Alice",
     "body": { "error": null, "result": RESULT, "in_reply_to": REQUEST_ID }}

`select_and_get_reply` message is a response to `select_and_get`.

If the `select_and_get` operation succeeds, `body.error` field is `null`, and `result` is the result object obtained by the operation.

If the operation fails, `body.error` is the reason of the error.


### select_and_listen

    {"message_id": ID, "message_type": "select_and_listen",
     "from": "Alice", "to": "Bob",
     "body": { "eval_code": CODE, "node_id": "Bob",
               "method": METHOD_NAME, "options": [OPT1, OPT2] }}

**TODO: body.node_id is not necessary.**

`select_and_listen` message tells a remote node ("Bob") to execute a method that requires a callback function.

When the remote node ("Bob") receives the message, it executes the following.

1. It evaluates `body.eval_code` that is a JavaScript string. Let the result be `RESULT`.
2. Create a callback function object. Let it be `CALLBACK`.
3. Execute the following

        RESULT[METHOD_NAME].apply(RESULT, [OPT1, OPT2, CALLBACK]);

The `CALLBACK` it creates sends a `signal` message when called, thus reporting the event to the requester node ("Alice").

Note that this message type may be deprecated in the future because evaluating arbitrary code (`body.eval_code`) is dangerous.

### select_and_listen_reply

    {"message_id": ID, "message_type": "select_and_listen_reply",
     "from": "Bob", "to": "Alice",
     "body": { "error": null, "result": "OK", "in_reply_to": REQUEST_ID }}

**TODO: test the order of select_and_listen_reply and signal messages**

`select_and_listen_reply` message is a response to a `select_and_listen` message.  It is sent before any `signal` message is sent.

If the `select_and_listen` operation succeeds, `body.error` field is `null`. Otherwise, `body.error` is the reason of the error.

### signal

    {"message_id": ID, "message_type": "signal",
     "from": "Bob", "to": "Alice",
     "body": { "error": null, "in_reply_to": REQUEST_ID,
               "callback_this": THIS_OBJECT, "callback_args": [ARG1, ARG2]}}

`signal` message is sent when an event occurs in the sending node. The event must be watched beforehand by a `select_and_listen` message.

`body.in_reply_to` field is the message ID of the `select_and_listen` message.

`body.callback_this` field is the context object of the callback function for the event. It is the object you refer to as `this` in the callback function.

`body.callback_args` field. is an array of argument objects supplied to the callback function for the event.

Note that `body.callback_this` and `body.callback_args` can contain "remote DOM pointers". See below for detail.


## Remote DOM Pointer

Sometimes jQluster nodes need to send DOM objects in their pages so that the receiver node can refer to the DOM in the remote node.

To do that, jQluster protocol defines a remote DOM pointer object that is structured as follows.

    {
      "remote_type": "xpath",
      "remote_node_id": NODE_ID,
      "remote_xpath": XPATH_TO_THE_DOM
    }

`remote_node_id` field is the jQluster node ID where the remote DOM exists.

`remote_xpath` field is the XPath string pointing to the DOM object.


## Author

Toshio Ito - https://github.com/debug-ito
