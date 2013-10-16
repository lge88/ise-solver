var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;

var common = require( './ISESolver.common');

module.exports = exports = ISESolver;

function ISESolver( model ) {
  this.model( model );
  this.recorders = [];
  this.opensees = new OpenSees;

  var d = Q.defer();
  var _initialized = this._initialized = d.promise;
  this.opensees.on( 'ready', function() {
    d.resolve();
  } );

  this.opensees.on( 'stderr', this.onOpenSeesError.bind( this ) );
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

  this._initialized.then( function() {
    var type = model.analysis.analysis.type;
    if ( type === 'Static' ) {
      cb = dt;
      dt = '';
    }


    var list = _this._resetModel();
    toOpenSees( model, {
      fields: [ 'analysis' ]
    }).forEach(function( x ) {
      list.push( x );
    });

    var i;
    for ( i = 0; i < steps; ++i ) {
      list.push([
        'analyze ',
        1,
        dt
      ].join( '' ));

      _this._recordModel().forEach(function( x ) {
        list.push( x );
      });
      list.push( opensees.flushDataCmd() );
    }
    list.push( opensees.writeDataCmd() + ' "{\\"type\\":\\"End\\"}"' );
    list.push( opensees.flushDataCmd() );

    opensees.on( 'data', function onData( data ) {

      data = ( '' + data )
        .trim()
        .split( '\n' )
        .map( function( str ) {
          return JSON.parse( str );
        } )
        .forEach(function( item ) {
          if ( item.time ) {
            var key = item.time.toFixed( 4 ), state;
            if ( !model.history[ key ] ) {
              model.history[ key ] = {
                time: key
              };
            }
            state = model.history[ key ];

            if ( item.type === 'NodalDisplacements' ) {
              var i, j, len = item.data.length;
              var ndm = model.model_builder.ndm, ndmAnd1= ndm + 1;
              state.nodalDisplacements || ( state.nodalDisplacements = {} );
              var nodalDisplacements = state.nodalDisplacements;
              var arr = item.data, tmp;

              for ( i = 0; i < len; i = i + ndmAnd1 ) {
                tmp = new Array( ndm );
                for ( j = 0; j < ndm; ++j ) {
                  tmp[ j ] = arr[ i+j+1 ];
                }
                nodalDisplacements[ arr[i] ] = tmp;
              }
            }

            model.state = state;
            d.notify( state );
          } else if ( item.type === 'End' ) {
            opensees.removeListener( 'data', onData );
            d.resolve( model );
          }
        });
    });

    // finally fire off the request
    var commands = list.join( '\n' );
    opensees.interp( commands );
  }, function() {
    d.reject( new Error( 'ISESolver: failed to init opensees' ) );
  } );

  return d.promise;
};

ISESolver.prototype.eigen = function( mode ) {

};

ISESolver.prototype.onOpenSeesError = function( err ) {
  this.emit( 'stderr', err );
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
  this.recorders.map(function( recorder ) {
    var t = recorder.type;
    if ( t === 'NodalDisplacement' ) {
      out.push( opensees.recordNodalDisplacementsCmd( recorder.nodes ) );
    }
  });
  return out;
};
