var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;

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

ISESolver.prototype.model = function( m ) {
  if ( !m ) {
    return this._model;
  } else {
    this._model = m;
    this._model.history || ( this._model.history = {} );
    this._model.state || ( this._model.state = {} );
    return this;
  }
};


ISESolver.prototype.analysisType = function( type ) {
  if ( !type ) {
    return this._model.analysis.type;
  } else {
    this._model.analysis.type = type;
    return this;
  }
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

ISESolver.prototype.addRecorder = function( options ) {
  options || ( options = {} );
  if ( options.type ) {
    this.recorders.push( options );
  }
  return this;
};

ISESolver.prototype.onOpenSeesError = function( err ) {
  this.emit( 'stderr', err );
  // console.log( err );

};

// ISESolver.prototype.onOpenSeesResult = function( data ) {
//   data = ('' + data).trim().split( '\n' ).map( function( str ) {
//     return JSON.parse( str );
//   } );

//   if ( data.time ) {
//     var key = data.time.toFixed( 4 ), state;
//     if ( !this.model.results[ key ] ) {
//       this.model.results[ key ] = {
//         time: key
//       };
//       state = this.model.results[ key ];
//     }

//     if ( data.type === 'NodalDisplacements' ) {
//       state.nodalDisplacements = data.data;
//     }
//     this.state = state;
//   } else if ( data.type === 'End' ) {

//   }

//   // console.log( data );


// };

ISESolver.prototype.boilerplate = function( t ) {
  var type = t || this._model.analysis.analysis.type;
  var model = this._model;
  if ( type.match( /[Ss]tatic/ ) ) {
    model.analysis = {
      system: { type: 'BandSPD' },
      numberer: { type: 'RCM' },
      constraints: { type: 'Plain' },
      integrator: { type: 'LoadControl', lambda: 0.1 },
      algorithm: { type: 'Linear' },
      analysis: { type: 'Static' },
      analyze: { steps: 10 }
    };
  } else if ( type.match( /[Dd]ynamic/ ) ) {
    model.analysis = {
      constraints: { type: 'Transformation' },
      numberer: { type: 'RCM' },
      system: { type: 'BandSPD' },
      test: { type: 'NormUnbalance', tolerance: 0.1, maxIteration:200 },
      algorithm: { type: 'Newton', useInitialThenCurrentStiffness: true },
      integrator: { type: 'Newmark', gamma: 0.5, beta: 0.25 },
      analysis: { type: 'Transient' },
      analyze: { steps: 1, dt: 0.01 }
    };
  } else if ( type.match( /[Ee]igen/ ) ) {
    model.analysis.eigen || ( this.model.analysis.eigen = {} );
    model.analysis.eigen = {
      numOfEigenValues: 1
    };
  }
  return this;
};
