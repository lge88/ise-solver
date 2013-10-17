
var ISESolver = require( 'ise-solver' );
var expect = require( 'expect.js' );
var debug = require( 'debug' )( 'test' );
var Q = require( 'q' );

describe( 'ise-solver', function() {

  it( 'should recover after opensees error', function( done ) {
    var trusses = require( './fixtures/trusses' );
    var solver = new ISESolver();
    var statesCount = 0;

    var nodes = trusses.nodes;

    delete trusses.nodes;

    solver
      .model( trusses )
      .analysisType( 'static' )
      .boilerplate()
      .report({ type: 'node_disp' })
      .analyze( 10 )
      .then(function( finalState ) {

      }, function( err ) {
        expect( err.message ).to.match( /ISESolver/ );

        // do it again with correct one:
        trusses.nodes = nodes;

        solver
          .model( trusses )
          .analysisType( 'static' )
          .boilerplate()
          .report({ type: 'node_disp' })
          .analyze( 10 )
          .then(function( finalState ) {
            var x = 0.53009277713228375450;
            var y = -0.17789363846931768864;
            expect( finalState.node_disp[ 4 ][ 0 ] - x ).to.be.within( -1e-8, 1e-8 );
            expect( finalState.node_disp[ 4 ][ 1 ] - y ).to.be.within( -1e-8, 1e-8 );
            expect( finalState.node_disp[ 3 ][ 1 ] - y ).to.not.be.within( -1e-8, 1e-8 );
            expect( Object.keys( finalState.node_disp ).length )
              .to.be( trusses.nodes.length );
          } )
          .then( done, done );

      } );
  } );

} );
