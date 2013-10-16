var expect = require( 'expect.js' );

var ISESolverIOServer = require( 'ise-solver' ).io.Server;
var ISESolverIOClient = require( 'ise-solver' ).io.Client;
var port = 3000;
var ns = '/solve';
var io = require( 'socket.io' )
  .listen( port )
  .of( ns );

var server = new ISESolverIOServer( { io: io } );
var socket = require( 'socket.io-client' )
  .connect( 'http://localhost:' + port + ns );
var solverClient = new ISESolverIOClient( socket );

describe( 'ise-solver', function() {

  it( 'should output correct nodal disp', function( done ) {
    // var truesses = require( './fixtures/trusses' );

    // solverClient
    //   .model( trusses )
    //   .analysisType( 'static' )
    //   .boilerplate()
    //   .addRecorder({ type: 'NodalDisplacement' })
    //   .analyze( 10 )
    //   .then(function( model ) {
    //     var x = 0.53009277713228375450;
    //     var y = -0.17789363846931768864;
    //     var state = model.state;
    //     expect( state.nodalDisplacements[ 4 ][ 0 ] - x ).to.be.within( -1e-8, 1e-8 );
    //     expect( state.nodalDisplacements[ 4 ][ 1 ] - y ).to.be.within( -1e-8, 1e-8 );
    //     expect( state.nodalDisplacements[ 3 ][ 1 ] - y ).to.not.be.within( -1e-8, 1e-8 );
    //   }, function( err ) {
    //     // console.log( err );
    //   }, function( state ) {
    //     // console.log( 'state', state );
    //   })
    //   .then( done, done );

  } );

} );
