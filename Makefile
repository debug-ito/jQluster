
SRC=$(addprefix js/, \
      util.js connection.js connection_websocket.js local_server.js transport.js transport_loopback.js \
      remote_selector.js readiness_callback_manager.js remote_selector_factory.js jquery_adaptor.js)

jqluster.js: $(SRC)
	/bin/cat $(SRC) > $@

clean:
	/bin/rm -f jqluster.js
