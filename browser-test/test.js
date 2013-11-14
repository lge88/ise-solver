
var expect = require( 'expect.js' );
var io = window.io;
var Q = require( 'q' );

var ISESolver = require( 'ise-solver' );

var port = 3000;
var ns = '/solve';
var socket = io.connect( 'http://localhost:' + port + ns );

describe( 'ise-solver', function() {

  var model = {
    id: 'trusses-12345',
    rev: '12123',
    model_builder: { type: 'BasicBuilder', ndm: 2, ndf: 2 },
    materials: [
      { id: 1, type: 'uniaxial.Elastic', E: 3000 }
    ],
    time_series: [
      { id: 1, type: 'Linear' }
    ],
    nodes: [
      { id: 1, position:{ x:   0, y:  0 } },
      { id: 2, position:{ x: 144, y:  0 } },
      { id: 3, position:{ x: 168, y:  0 } },
      { id: 4, position:{ x:  72, y: 96 } }
    ],
    elements: [
      { id: 1, type: 'truss', nodes_id: [ 1, 4 ], A: 10, material_id: 1 },
      { id: 2, type: 'truss', nodes_id: [ 2, 4 ], A:  5, material_id: 1 },
      { id: 3, type: 'truss', nodes_id: [ 3, 4 ], A:  5, material_id: 1 }
    ],
    single_point_constraints: [
      { id: 1, node_id: 1, is_prescribed: [ 1, 1 ] },
      { id: 2, node_id: 2, is_prescribed: [ 1, 1 ] },
      { id: 3, node_id: 3, is_prescribed: [ 1, 1 ] }
    ],
    loads: [
      { id: 1, node_id: 4, type: 'NodalForce', value: [ 100, -50 ] }
    ],
    patterns: [
      { id: 1, type: 'Plain', time_series_id: 1, load_id: [ 1 ] }
    ]
  };

  var analysis = {
    type: 'Static',
    steps: 10,
    system: { type: 'BandSPD' },
    numberer: { type: 'RCM' },
    constraints: { type: 'Plain' },
    integrator: { type: 'LoadControl', lambda: 0.1 },
    algorithm: { type: 'Linear' }
  };

  model.analysis = analysis;
  model.analysis.analysis = { type: analysis.type };

  var recorder = [
    { type: 'node_disp' }
  ];

  it( 'should output all nodal displacements', function( done ) {

    var solver = new ISESolver( socket );
    var statesCount = 0;

    console.log( solver );

    solver
      .solve( model, analysis, recorder )
      .then(function( finalState ) {

        var x = 0.53009277713228375450;
        var y = -0.17789363846931768864;
        expect( finalState.node_disp[ 4 ][ 0 ] - x ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 4 ][ 1 ] - y ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 3 ][ 1 ] - y ).to.not.be.within( -1e-8, 1e-8 );
        expect( Object.keys( finalState.node_disp ).length )
          .to.be( model.nodes.length );
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
        }, 100 );
        return d.promise;
      } )
      .then( done, done );
  } );

  it( 'should output selected nodal displacements', function( done ) {

    var solver = new ISESolver( socket );

    var recorder = [
      { type: 'node_disp', nodes: [ 1, 4 ] }
    ];

    solver
      .solve( model, analysis, recorder )
      .then(function( finalState ) {
        var x = 0.53009277713228375450;
        var y = -0.17789363846931768864;

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

  it( 'should output node disp and element forces', function( done ) {
    var solver = new ISESolver( socket );

    var recorder = [
      { type: 'element_force' },
      { type: 'node_disp', nodes: [ 1, 4 ] }
    ];

    solver
      .solve(model, analysis, recorder)
      .then(function( finalState ) {
        var x = 0.53009277713228375450;
        var y = -0.17789363846931768864;

        var e1_start_x = -26.36111332558741793264;
        var e1_start_y = -35.14815110078322391018;
        var e1_end_x = 26.36111332558741793264;
        var e1_end_y = 35.14815110078322391018;
        var tol = 1e-10;

        console.log( finalState );


        expect( finalState.node_disp[ 1 ][ 1 ] ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 4 ][ 0 ] - x ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 4 ][ 1 ] - y ).to.be.within( -1e-8, 1e-8 );
        expect( finalState.node_disp[ 3 ]).to.be( undefined );
        expect( Object.keys( finalState.node_disp ).length )
          .to.be( 2 );

        expect( finalState.element_force[ 1 ][ 0 ] - e1_start_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 1 ] - e1_start_y ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 2 ] - e1_end_x ).to.be.within( -tol, tol );
        expect( finalState.element_force[ 1 ][ 3 ] - e1_end_y ).to.be.within( -tol, tol );
        expect( Object.keys( finalState.element_force ) )
          .to.eql( model.elements.map( function( e ) {
            return e.id + '';
          } ) );
      })
      .then( done, function( err ) {
        done( new Error( err ) );
      } );
  } );

  it( 'should output selected element forces', function( done ) {

    var solver = new ISESolver( socket );
    var recorder = [ { type: 'element_force', elements: [ 1 ] } ];

    solver
      .solve(model, analysis, recorder)
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
          .to.eql( [ '1' ] );
      }, function( err ) {
        // console.log( err );
      }, function( state ) {
        // console.log( 'state', state );
      })
      .then( done, done );
  } );

} );
