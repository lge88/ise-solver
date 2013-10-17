
if ( isServer() ) {
  module.exports = exports = require( './ISESolver' );
  exports.io = {
    Server: require( './ISESolver.io.Server' ),
    Client: require( './ISESolver.io.Client' )
  };
} else {
  module.exports = exports = require( './ISESolver.io.Client' );
}

function isServer() {
   return ! (typeof window != 'undefined' && window.document);
}
