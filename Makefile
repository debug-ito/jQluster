
SRC=$(addprefix js/, \
      util.js Connection.js ConnectionWebSocket.js ServerLocal.js ConnectionLocal.js \
      Transport.js TransportLoopback.js \
      RemoteSelector.js ReadinessCallbackManager.js ReadinessCallbackManagerLoopback.js \
      RemoteSelectorFactory.js jquery_adaptor.js)

jqluster.js: $(SRC)
	/bin/cat $(SRC) > $@

doc: doc/api/index.html

doc/api/index.html: $(SRC)
	mkdir -p doc/api/ && jsdoc -d doc/api $(SRC)

clean:
	/bin/rm -rf jqluster.js doc/api
