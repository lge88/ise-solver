
var ISESolver = require( 'ise-solver' );
var expect = require( 'expect.js' );
var debug = require( 'debug' )( 'test' );
var Q = require( 'q' );

describe( 'ise-solver', function() {

  it( 'should output all nodal displacements', function( done ) {
    var trusses = require( './fixtures/trusses' );
    var solver = new ISESolver();
    var statesCount = 0;

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
      }, function( err ) {
        // console.log( err );
      }, function( state ) {
        if ( state.type !== 'Start' &&
             state.type !== 'End' ) {
          statesCount++;
        }
      })
      .then( function() {
        var d = Q.defer();
        setTimeout( function() {
          expect( statesCount ).to.be( 10 );
          d.resolve();
        }, 100 )
        return d.promise;
      } )
      .then( done, done );
  } );

  it( 'should output selected nodal displacements', function( done ) {
    var trusses = require( './fixtures/trusses' );
    var solver = new ISESolver();
    solver
      .model( trusses )
      .analysisType( 'static' )
      .boilerplate()
      .report({ type: 'node_disp', nodes: [ 1, 4 ] })
      .analyze( 10 )
      .then(function( finalState ) {
        var x = 0.53009277713228375450;
        var y = -0.17789363846931768864;

        debug( 'selected', finalState );

        expect( finalState.node_disp[ 1 ][ 1 ] ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 4 ][ 0 ] - x ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 4 ][ 1 ] - y ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 3 ]).to.be( undefined );
        expect( Object.keys( finalState.node_disp ).length )
          .to.be( 2 );
      }, function( err ) {
        // console.log( err );
      }, function( state ) {
        // console.log( 'state', state );
      })
      .then( done, done );
  } );

  it( 'should output all element forces', function( done ) {
    var trusses = require( './fixtures/trusses' );
    var solver = new ISESolver();

    solver
      .model( trusses )
      .analysisType( 'static' )
      .boilerplate()
      .report({ type: 'element_force' })
      .analyze( 10 )
      .then(function( finalState ) {
        var e1_start_x = -26.36111332558741793264;
        var e1_start_y = -35.14815110078322391018;
        var e1_end_x = 26.36111332558741793264;
        var e1_end_y = 35.14815110078322391018;
        var tol = 1e-10;

        expect( finalState.element_force[ 1 ][ 0 ] - e1_start_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 1 ] - e1_start_y ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 2 ] - e1_end_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 3 ] - e1_end_y ).to.be.within( -tol, tol );
        expect( Object.keys( finalState.element_force ) )
          .to.eql( trusses.elements.map( function( e ) {
            return e.id + '';
          } ) );
      })
      .then( done, done );
  } );

  it( 'should output selected element forces', function( done ) {
    var trusses = require( './fixtures/trusses' );
    var solver = new ISESolver();

    solver
      .model( trusses )
      .analysisType( 'static' )
      .boilerplate()
      .report({ type: 'element_force', elements: [ 1 ] })
      .analyze( 10 )
      .then(function( finalState ) {
        // debug( 'element', finalState );
        var e1_start_x = -26.36111332558741793264;
        var e1_start_y = -35.14815110078322391018;
        var e1_end_x = 26.36111332558741793264;
        var e1_end_y = 35.14815110078322391018;
        var tol = 1e-10;
        expect( finalState.element_force[ 1 ][ 0 ] - e1_start_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 1 ] - e1_start_y ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 2 ] - e1_end_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 3 ] - e1_end_y ).to.be.within( -tol, tol );
        expect( Object.keys( finalState.element_force ) )
          .to.eql( [ '1' ] );
      }, function( err ) {
        console.log( err );
        // console.log( err );
      }, function( state ) {
        // console.log( 'state', state );
      })
      .then( done, done );
  } );

  it( 'should output correct result for quads', function( done ) {
    var model = require( './fixtures/quads' );
    var solver = new ISESolver();

    solver
      .model( model )
      .analysisType( 'static' )
      .boilerplate()
      .report({ type: 'element_force', elements: [ 1 ] })
      .analyze( 10 )
      .then(function( finalState ) {
        // console.log( 'finalState: ', finalState );

        // // debug( 'element', finalState );
        // var e1_start_x = -26.36111332558741793264;
        // var e1_start_y = -35.14815110078322391018;
        // var e1_end_x = 26.36111332558741793264;
        // var e1_end_y = 35.14815110078322391018;
        // var tol = 1e-10;
        // expect( finalState.element_force[ 1 ][ 0 ] - e1_start_x ).to.be.within( -tol, tol );
        // expect( finalState.element_force[ 1 ][ 1 ] - e1_start_y ).to.be.within( -tol, tol );
        // expect( finalState.element_force[ 1 ][ 2 ] - e1_end_x ).to.be.within( -tol, tol );
        // expect( finalState.element_force[ 1 ][ 3 ] - e1_end_y ).to.be.within( -tol, tol );
        // expect( Object.keys( finalState.element_force ) )
        //   .to.eql( [ '1' ] );
      }, function( err ) {
        console.log( err );
        // console.log( err );
      }, function( state ) {
        // console.log( 'state', state );
      })
      .then( done, done );
  } );

} );
