var test = require('tape')

var vas = require('../')
var pull = vas.pull

test('can create client and server streams with nested services', function(t) {
  t.plan(2)
    var expectedPeople = ["Timmy", "Bob"]
    var expectedCats = ["Fluffy", "Meow"]
    var services = {
      cats: {
        name: 'cats',
        version: '0.0.0',
        permissions: function (path, args) {},
        manifest: {
          find: 'source' 
        },
        init: function (server, config) {
          return { find }

          function find () {
            return pull.values(expectedCats)
          }
        },
        services: {
          people: {
            name: 'people',
            version: '0.0.0',
            permissions: function (path, args) {},
            manifest: {
              find: 'source' 
            },
            init: function (server, config) {
              return { find }

              function find () {
                return pull.values(expectedPeople)
              }
            }
          }
        }
      }
    }

    var client = vas.createClient(services, {})
    var server = vas.createServer(services, {}) 
    var clientStream = client.createStream()
    var serverStream = server.createStream()

    pull(
      clientStream,
      serverStream,
      clientStream
    )

    pull(
      client.cats.find(),
      pull.collect(function(err, arr) {
        t.deepEqual(arr, expectedCats) 
      })
    )
    pull(
      client.cats.people.find(),
      pull.collect(function(err, arr) {
        t.deepEqual(arr, expectedPeople) 
      })
    )
})

