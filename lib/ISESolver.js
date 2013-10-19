var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;
var common = require( './ISESolver.common');

var debug = require( 'debug' )( 'ISESolver' );
var debugTcl = require( 'debug' )( 'ISESolver:tcl' );
var debugStdErr = require( 'debug' )( 'ISESolver:stderr' );
var debugForces = require( 'debug' )( 'ISESolver:forces' );

module.exports = exports = ISESolver;

function ISESolver( model ) {
  this.model( model );
  this.recorders = [];
  this.opensees = new OpenSees;

  var d = Q.defer();
  var _initialized = this._initialized = d.promise;
  var _this = this;
  this.opensees.on( 'ready', function() {
    d.resolve();
  } );

  this.opensees.on( 'stderr', this.onOpenSeesError.bind( this ) );

  // ensure the opensees process always running;
  this.opensees.on( 'exit', function onExit( data ) {
    var d = Q.defer();
    var _initialized = _this._initialized = d.promise;

    _this.emit( 'exit', data );
    // kill opensees process
    // _this.opensees.destroy();
    console.log( 'node exit:', _this.opensees.id )
    delete _this.opensees;
    _this.opensees = new OpenSees;

    _this.opensees.on( 'ready', function() {
      console.log( 'node init:', _this.opensees.id )
      d.resolve();
    } );

    _this.opensees.on( 'exit', onExit );

  } );

  return this;
}

ISESolver.OpenSees = OpenSees;
ISESolver.prototype.__proto__ = EventEmitter.prototype;

extend( ISESolver.prototype, common );


ISESolver.prototype.analyze = function( steps, dt, cb ) {
  var d = Q.defer();
  var model = this._model;
  var opensees = this.opensees;
  var _this = this;
  var state = {};

  this._initialized.then( function() {
    opensees.on( 'data', function onData( data ) {
      data = ( '' + data )
        .trim()
        .split( '\n' )
        .map( function( str ) {
          return JSON.parse( str );
        } )
        .forEach(function( item ) {
          if ( item.time ) {
            if ( item.time !== state.time ) {
              state = {
                model_id: model.id,
                rev_id: model.rev,
                time: item.time
              };
            }


            debug( 'item', item );
            state[ item.type ] = item.data;
            d.notify( state );
          }

          if ( item.type === 'End' ) {
            opensees.removeListener( 'data', onData );
            opensees.removeListener( 'exit', onError );
            d.resolve( state );
          }
        });
    });

    opensees.on( 'exit', onError );

    function onError( data ) {
      d.reject( new Error( 'ISESolver: errors occur when solving the model ' +
                           model.id + ', ' + data ) );
    }


    // finally fire off the request
    var commands = _this._generateAnalyzeCommandsList( steps, dt ).join( '\n' );
    debugTcl( commands );
    opensees.interp( commands );
  }, function() {
    d.reject( new Error( 'ISESolver: failed to init opensees' ) );
  } );

  return d.promise;
};

ISESolver.prototype._generateAnalyzeCommandsList = function( steps, dt ) {
  var model = this._model;
  var opensees = this.opensees;
  var type = model.analysis.analysis.type;
  if ( type === 'Static' ) {
    cb = dt;
    dt = '';
  }

  var list = this._resetModel();
  debugTcl( 'list after reset model:', list )
  toOpenSees( model, {
    fields: [ 'analysis' ]
  }).forEach(function( x ) {
    list.push( x );
  });

  debugTcl( 'list after analysis:', list )
  var i;
  for ( i = 0; i < steps; ++i ) {
    list.push([
      'analyze ',
      1,
      dt
    ].join( '' ));

    this._recordModel().forEach(function( x ) {
      list.push( x );
    });
    list.push( opensees.flushDataCmd() );
  }
  list.push( opensees.writeDataCmd() + ' "{\\"type\\":\\"End\\"}"' );
  list.push( opensees.flushDataCmd() );
  debugTcl( 'list after output setting:', list )
  return list;
}

ISESolver.prototype.eigen = function( mode ) {

};

ISESolver.prototype.onOpenSeesError = function( err ) {
  this.emit( 'stderr', err );
  debugStdErr( err );
};

ISESolver.prototype._resetModel = function() {
  var model = this._model;
  var list = toOpenSees( model, {
    filter: function( x ) { return x !== 'analysis'; }
  } );
  list.unshift( 'wipe' );
  return list;
};

ISESolver.prototype._recordModel = function() {
  var out = [], opensees = this.opensees;
  debugTcl( 'recorders', this.recorders );
  this.recorders.map(function( recorder ) {
    var t = recorder.type;
    if ( t === 'node_disp' ) {
      out.push( opensees.recordNodalDisplacementsCmd( recorder.nodes ) );
    } else if ( t === 'element_force' ) {

      out.push( opensees.recordElementForcesCmd( recorder.elements ) );
    }
  });
  debugTcl( '_recordModel', out );
  return out;
};
