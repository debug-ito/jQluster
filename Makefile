
SRC=$(addprefix js/, \
      util.js Connection.js ConnectionWebSocket.js ServerLocal.js ConnectionLocal.js \
      Transport.js TransportLoopback.js \
      RemoteSelector.js ReadinessCallbackManager.js ReadinessCallbackManagerLoopback.js \
      RemoteSelectorFactory.js jquery_adaptor.js)

jqluster.js: $(SRC)
	/bin/cat $(SRC) > $@

clean:
	/bin/rm -f jqluster.js
