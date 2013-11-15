var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;

var ISESolver = require( './ISESolver' );

module.exports = exports = ISESolverIOServer;

function ISESolverIOServer( options ) {
  options || ( options = {} );
  this.solver = new ISESolver;
  this.id = options.id;
}

ISESolver.OpenSees = OpenSees;
ISESolverIOServer.prototype.__proto__ = EventEmitter.prototype;

function noop() {}

ISESolverIOServer.prototype.serve = function( socket ) {
  var solver = this.solver;
  var binding = {
    id: this.id,
    remove: function() {
      socket.removeListener( 'analyze', handleAnalyzeRequest );
    }
  };

  socket.on( 'analyze', handleAnalyzeRequest );
  socket.on( 'exit', binding.remove );
  socket.emit( 'state', { type: 'Start', node: this.id } );

  function handleAnalyzeRequest( req, cb ) {
    var steps = req.steps, dt = req.dt;
    var model = req.model;
    var recorders = req.recorders;

    if ( typeof cb !== 'function' ) {
      cb = noop;
    }

    solver
      .model( model )
      .report( recorders )
      .analyze( steps, dt )
      .then( function( model ) {
        cb( null, model );
      }, function( err ) {
        cb( err.message );
      }, function( state ) {
        socket.emit( 'state', state );
      } );
  };

  return binding;
};
