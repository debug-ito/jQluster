VERSION=1.00
PRODUCT=jqluster-$(VERSION).js

SRC=$(addprefix js/, \
      util.js Connection.js ConnectionWebSocket.js ServerLocal.js ConnectionLocal.js \
      Transport.js TransportLoopback.js \
      RemoteSelector.js ReadinessCallbackManager.js ReadinessCallbackManagerLoopback.js \
      RemoteSelectorFactory.js jquery_adaptor.js)

$(PRODUCT): $(SRC)
	/bin/cat $(SRC) > $@

doc: doc/api/index.html

doc/api/index.html: $(SRC) doc/jsdoc_readme.md
	mkdir -p doc/api/ && jsdoc -c jsdoc.conf.json -d doc/api $^

clean:
	/bin/rm -rf $(PRODUCT) doc/api
