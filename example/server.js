var vas = require('../')

var service = require('./services/')
var config = require('./config')

var server = vas.createServer(service)

vas.listen(server, config)
