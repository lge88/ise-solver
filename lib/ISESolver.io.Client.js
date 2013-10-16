
var common = require( './ISESolver.common' );
var extend = require( 'extend' );

module.exports = exports = ISESolverIOClient;

function ISESolverIOClient( socket ) {
  this.socket = socket;
  if ( this.socket ) {
    this.listen( socket );
  }
}

extend( ISESolverIOClient.prototype, common );

ISESolverIOClient.prototype.listen = function( socket ) {
  socket.on( 'state', function( state ) {
    console.log( 'state', state );
  } );
}

ISESolverIOClient.prototype.model;
