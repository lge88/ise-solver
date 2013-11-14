
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

ISESolverIOClient.prototype.solve = function( model, analysis, recorder ) {
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

  var req = this._adaptAnalysisRequest( model, analysis, recorder );
  // console.log( JSON.stringify(req) );

  socket.emit( 'analyze', req, cb );
  socket.on( 'state', onProgress );
  return d.promise;
}

ISESolverIOClient.prototype._adaptAnalysisRequest = function( model, analysis, recorder ) {
  var json = {};
  var _model = model;
  var _analysis = analysis;
  var _recorder = recorder;

  if ( typeof model.toJSON === 'function' ) {
    _model = model.toJSON();
  }

  if ( typeof _analysis.toJSON === 'function' ) {
    _analysis = analysis.toJSON();
  }

  if ( typeof _recorder.toJSON === 'function' ) {
    _recorder = _recorder.toJSON();
  }

  _analysis.analysis = { type: _analysis.type };
  json.model = _model;
  json.model.analysis = _analysis;
  json.recorders = _recorder;
  json.steps = _analysis.steps;
  json.dt = _analysis.dt;

  console.log( json );


  // FIXME: it should be like just this
  // json.model = _model;
  // json.analysis = _analysis;
  // json.recorder = _recorder;
  return json;
}

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
  // console.log( JSON.stringify(req) );

  socket.emit( 'analyze', req, cb );
  socket.on( 'state', onProgress );
  return d.promise;
};

ISESolverIOClient.prototype.generateAnalysisRequest = function( steps, dt, onSuccess, onError, onProgress ) {
  return {
    model: this._model,
    recorders: this.recorders,
    steps: steps,
    dt: dt
  }
};


ISESolverIOClient.prototype.model;
