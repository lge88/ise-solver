var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;

var ISESolver = require( './ISESolver' );

module.exports = exports = ISESolverIOServer;

function ISESolverIOServer( options ) {
  options || ( options = {} );
  this.io = options.io;
  this.solver = new ISESolver();
  if ( this.io ) {
    this.listen( this.io );
  }
}

ISESolver.OpenSees = OpenSees;
ISESolverIOServer.prototype.__proto__ = EventEmitter.prototype;

ISESolverIOServer.prototype.listen = function( io ) {
  if ( !io ) {
    io = this.io;
  } else {
    this.io = io;
  }

  if ( io ) {
    var solver = this.solver;
    io.on( 'connection', function( socket ) {
      socket.emit( 'state', { type: 'Start' } );
      socket.on( 'analyze', function( steps, dt, model, recorders, cb ) {
        solver
          .model( model )
          .addRecorder( recorders )
          .analyze( steps, dt )
          .then(function( model ) {
            cb( model );
          }, function( err ) {
            cb( err );
          }, function( state ) {
            socket.emit( 'state', state );
          });
      } );
    } )
    this.started = true;
  }
};

ISESolverIOServer.prototype.stopListening = function() {
  io = this.io;
  if ( io ) {
    io.removeListener( 'connection', this._onIOConnection );
    this.started= false;
  }
};

ISESolverIOServer.prototype._onIOConnection = function() {
  var io = this.io, solver = this.solver;
  io.on( 'connection', function( socket ) {
    console.log( 'connected' );

    socket.emit( 'state', { type: 'Start' } );
    socket.on( 'analyze', function( steps, dt, model, recorders, cb ) {
      solver
        .model( model )
        .addRecorder( recorders )
        .analyze( steps, dt )
        .then(function( model ) {
          cb( model );
        }, function( err ) {
          cb( err );
        }, function( state ) {
          socket.emit( 'state', state );
        });
    } );
  } )
}
