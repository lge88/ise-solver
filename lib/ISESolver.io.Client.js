
var common = require( './ISESolver.common' );
var extend = require( 'extend' );
var Q = require( 'q' );

module.exports = exports = ISESolverIOClient;

function ISESolverIOClient( socket ) {
  this.recorders = [];
  this.socket = socket || exports.socket;
}

extend( ISESolverIOClient.prototype, common );
exports.socket = null;


ISESolverIOClient.prototype.generateAnalysisRequest = function( steps, dt, onSuccess, onError, onProgress ) {
  return {
    model: this._model,
    recorders: this.recorders,
    steps: steps,
    dt: dt
  }
};


ISESolverIOClient.prototype.analyze = function( steps, dt ) {
  var socket = this.socket;
  if ( !socket ) {
    throw new Error( 'ISESolverIOClient: socket is not setup yet!' );
  }

  var d = Q.defer();

  var onProgress = function( state ) {
    d.notify( state );
  };

  var cb = function( err, model ) {
    if ( err ) {
      d.reject( err );
    } else {
      d.resolve( model );
    }
  };

  var req = this.generateAnalysisRequest( steps, dt );

  socket.emit( 'analyze', req, cb );
  socket.on( 'state', onProgress );
  return d.promise;
};

ISESolverIOClient.prototype.model;
