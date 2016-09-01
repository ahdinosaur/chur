var defined = require('defined')
var Url = require('url')
var Path = require('path')
var pullHttp = require('pull-http-client')
var pull = require('pull-stream')

var defaultSerialize = require('../serialize')

module.exports = createHttpClient

function createHttpClient (client, options) {
  options = defined(options, {})

  var serialize = defined(options.serialize, defaultSerialize)
  var manifest = client.manifest
  var url = defined(options.url, '/')
  var base = typeof url === 'object' ? url : Url.parse(url)

  return map(manifest, [], function (name, type) {
    const binary = type[type.length - 1] === '.'
    type = {
      stream: binary ? type.substring(0, type.length - 1) : type,
      binary: binary
    }

    return function (options, cb) {
      var url = Url.format({
        protocol: base.protocol,
        host: base.host,
        pathname: Path.join(
          base.pathname || '/',
          name.join('/')
        ),
        query: options
      })
      var httpOpts = {
        url: url,
        json: true,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }

      switch (type.stream) {
        case 'async':
        case 'sync':
          return pullHttp.async(httpOpts, function (err, data) {
            if (err) return cb(err)
            handleData(data, cb)
          })
        case 'source':
          if (type.binary) {
            httpOpts.headers['Accept'] = 'application/octet-stream'
          } else {
            httpOpts.headers['Accept'] = 'application/json; boundary=NLNL'
          }
          httpOpts.headers['Transfer-Encoding'] = 'chunked'
          return pull(
            pullHttp.source(httpOpts),
            serialize.parse(),
            pull.asyncMap(handleData)
          )
        case 'sink':
          httpOpts.method = 'POST'
          if (type.binary) {
            httpOpts.headers['Content-Type'] = 'application/octet-stream'
          } else {
            httpOpts.headers['Content-Type'] = 'application/json; boundary=NLNL'
          }
          httpOpts.headers['Transfer-Encoding'] = 'chunked'
          return pull(
            serialize.stringify(),
            pullHttp.sink(httpOpts, cb || ifErrorThrow)
          )
      }
    }
  })
}

function ifErrorThrow (err) {
  if (err) throw err
}

function handleData (data, cb) {
  if (data.error) {
    cb(data.error)
  } else if (data.value) {
    cb(null, data.value)
  }
}

function map (manifest, name, fn) {
  var o = {}
  for (var key in manifest) {
    var value = manifest[key]
    if (value == null) continue
    o[key] = (
      typeof value === 'string' ? fn(name.concat(key), value)
    : (o && typeof value === 'object') ? map(value, name.concat(key), fn)
    : (function () { throw new Error('invalid manifest:' + value) })()
    )
  }
  return o
}