/**
 * Module dependencies.
 */

var originalSuperagent = require('superagent');
var each = require('lodash.foreach');
var methods = require('./methods');
var protoMethods = Object.keys(originalSuperagent.Request.prototype);
var Emitter = require('emitter-component');

/**
 * Expose `requestFactory`.
 */

module.exports = requestFactory;

/**
 * Create a new request with defaults
 *
 * @api public
 */

function requestFactory(superagent) {
  superagent = superagent || originalSuperagent;

  var stack = [];  // store stack in scope

  // add protomethods
  each(protoMethods, function(method) {
    // blacklist unsupported functions
    if (~['end'].indexOf(method)) return;

    request[method] = function() {
      stack.push({
        method: method,
        args: arguments
      });

      return request;
    }
  });

  // proxy superagent methods
  each(methods, function(name) {
    request[name] = function() {
      var args = Array.prototype.slice.call(arguments);

      // save optional callback for later
      var fn = typeof args[args.length - 1] === "function" ?
        args.pop() :
        null ;

      // start request without callback,
      // inject defaults, then optionally end request
      var req = superagent[name].apply(null, args);
      handle(req);
      if (fn) req.end(fn);
      return req;
    }
  });

  return Emitter(request);

  function handle(req) {

    // apply stack
    each(stack, function(step) {
      req[step.method].apply(req, step.args);
    });
    request.emit('request', req);
  }

  function request(method, url) {
    if (typeof url === 'function') {
      return request.get(method, url);
    }

    if (arguments.length === 1) {
      return request.get(method);
    }

    var req = superagent(method, url);
    handle(req);
    return req;
  };
}
