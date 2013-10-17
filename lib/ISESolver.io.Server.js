var extend = require( 'extend' );
var toOpenSees = require( 'ise-to-opensees' );
var OpenSees = require( './opensees' );
var Q = require( 'q' );
var EventEmitter = require( 'events' ).EventEmitter;

var ISESolver = require( './ISESolver' );

module.exports = exports = ISESolverIOServer;

// function ISESolverNode() {
//   this.id = id;
//   this.status = ISESolverNode.NOT_INITIALIAZED;
//   this.solver = new ISESolver;
//   var _this = this;
//   this.solver.on( 'ready', function() {
//     _this.changeState( ISESolverNode.AVAILABLE );
//   } );
//   this.solver.on( 'exit', function() {
//     _this.changeState( ISESolverNode.NOT_INITIALIAZED );
//   } );
// }

// ISESolverNode.prototype.changeState = function( state ) {
//   this.status = state;
//   this.emit( 'statusChanged', state );
// }

// ISESolverNode.prototype.__proto__ = EventEmitter.prototype;

// ISESolverNode.NOT_INITIALIAZED = 1;
// ISESolverNode.AVAILABLE = 1;
// ISESolverNode.BUSY = 2;

function ISESolverIOServer( options ) {
  options || ( options = {} );
  var numOfNodes = this.numOfNodes = options.numOfNodes || 1;
  // this.maxRetry = options.maxRetry || 10;
  // this.retryInterval = options.retryInterval || 100;
  // this.nodes = {};
  // this.pool = [];
  this.id = options.id;
  this.status = 'available';
  this.solver = new ISESolver;
  // this.solvers = {};
  // for ( i = 0; i < numOfNodes; ++i ) {
    // var solver = new ISESolver;
    // console.log( i );
    // this.solvers[ i ] = solver;
    // this.solverPool.push( solver );
    // this.createSolver( i );
  // }
  // this.solver = new ISESolver;
  // this.solver.on( 'ready', function() {

  // } )
}

ISESolver.OpenSees = OpenSees;
ISESolverIOServer.prototype.__proto__ = EventEmitter.prototype;


ISESolverIOServer.prototype.createSolver = function( id ) {
  var solver = new ISESolver;
  // console.log( solver );

  var pool = this.solverPool;
  this.solvers[ id ] = solver;
  pool.push( solver );
  // console.log( pool );


  // solver.on( 'reinit', function() {
  //   pool.push( solver );
  // } );
}

ISESolverIOServer.prototype.pickASolver = function( cb ) {
  // var pool = this.solverPool;
  // var solver = pool.shift();

  if ( this.solver ) {
    cb( null, this.solver );
  } else {
    cb( new Error( 'ISESolverIOServer: not solver available!' ) );
  }
}

function noop() {}
ISESolverIOServer.prototype._handleAnalyzeRequest = function( req, cb ) {

}

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
        cb( err );
      }, function( state ) {
        socket.emit( 'state', state );
      } );
  };

  return binding;
};

ISESolverIOServer.prototype.listen = function( io ) {
  if ( !io ) {
    io = this.io;
  } else {
    this.io = io;
  }

  function noop() {}

  // console.log( 'listen' )
  if ( io ) {
    // var pickASolver = this.pickASolver.bind( this );
    var solver = this.solver;
    io.on( 'connection', function( socket ) {
      // console.log( 'listen' )
      // socket.emit( 'state', { type: 'Start' } );

      socket.on( 'analyze', function( req, cb ) {
        // pickASolver( function( err, solver ) {
        //   if ( err ) {
        //     cb( err );
        //   } else {
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
                cb( err );
              }, function( state ) {
                socket.emit( 'state', state );
              } );
          // }

        // } );
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
