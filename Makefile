NODE = node

test:
	@./node_modules/.bin/mocha --reporter spec test/test.js
	@./node_modules/.bin/mocha --reporter spec test/threads_test

.PHONY: test
