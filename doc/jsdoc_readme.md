# Overview of jQluster internal APIs

jQluster API uses the global variable `jQluster` as its own namespace.
Under `jQluster` there are various classes. `jQluster` namespace also
has some utility functions defined by `util.js`.

Although most functionalities are confined in `jQluster` namespace,
`jquery_adaptor.js` exports some of them to `jQuery` variable, so that
you can use jQluster as a jQuery plugin.

## Relationship of jQluster classes

Below is the stack diagram of jQluster classes. A class uses the
classes in the stack just below it.

    +----------------------------------+
    |        jQuery.jqluster           |
    +----------------------------------+                 +----------------+
    |      RemoteSelectorFactory       | -- generates -> | RemoteSelector |
    +-------+--------------------------+                 +----------------+
    |       | ReadinessCallbackManager |                 |   Transport    |
    |       +--------------------------+                 +----------------+
    |           Transport              |                 |   Connection   |
    +----------------------------------+                 +----------------+
    |           Connection             |
    +----------------------------------+


Below is the inheritance hierarchy diagram of jQluster classes.

    ReadinessCallbackManager
      +-- ReadinessCallbackManagerLoopback
    
    Transport
      +-- TransportLoopback
    
    Connection (abstract)
      +-- ConnectionWebSocket
      +-- ConnectionLocal
