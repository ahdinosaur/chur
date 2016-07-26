var test = require('tape')

var vas = require('../')
var pull = vas.pull

test('can create a client and server streams', function (t) {
  var expected = ['Timmy', 'Bob']
  var service = {
    name: 'people',
    version: '0.0.0',
    permissions: function (path, args) {},
    manifest: {
      find: 'source'
    },
    methods: function (server, config) {
      return { find }

      function find () {
        return pull.values(expected)
      }
    }
  }

  var client = vas.createClient(service, {})
  var server = vas.createServer(service, {})

  var clientStream = client.createStream()
  var serverStream = server.createStream()

  pull(
    clientStream,
    serverStream,
    clientStream
  )

  pull(
    client.people.find(),
    pull.collect(function (err, arr) {
      t.error(err)
      t.deepEqual(arr, expected)
      t.end()
    })
  )
})
