
var ISESolver = require( 'ise-solver' );
var expect = require( 'expect.js' );
var debug = require( 'debug' )( 'test' );
var Q = require( 'q' );

describe( 'ise-solver', function() {

  it( 'should output correct result for quads', function( done ) {

    var p = -100e3;
    var E = 200.0e9;
    var b = 0.1250;
    var l = 1.0;
    var v = 0.3;

    var A = b*b;
    var h = b;
    var I = b*h*h*h/12;
    var dtipExpect = p*l*l*l/3/E/I;

    console.log( 'expect', dtipExpect );

    var nx = 50, ny = 20;
    var blk = block2d(
      { x: 0, y: 0 }, { x: l, y: 0 },
      { x: l, y: h }, { x: 0, y: h },
      nx,
      ny
    );

    var mat = {
      id: 1, type: 'nD.ElasticIsotropic',
      E: E, v: v
    };

    var nodes = blk.nodes;
    var elements = blk.elements
      .map( function( el ) {
        el.thick = b;
        el.material_id = 1;
        el.subType = 'PlaneStress';
        return el;
      } );

    var idCount = 0;
    var spcs = nodes
      .filter( function( n ) {
        var p = n.position;
        return p.x < 0.01 && p.x > -0.01;
      } )
      .map( function( n ) {
        return {
          id: ++idCount, node_id: n.id,
          is_prescribed: [ 1, 1 ]
        };
      } );

    var rightEdge = nodes
      .filter( function( n ) {
        var p = n.position;
        return p.x < l + 0.01 && p.x > l - 0.01;
      } );

    var rightEdgeNodesId = rightEdge.map(function( x ) {
      return x.id;
    });

    var forcePerNode = p / rightEdge.length;

    var idCount = 0;
    var loads = rightEdge
      .map( function( n ) {
        return {
          id: ++idCount, node_id: n.id,
          type: 'NodalForce',
          value: [ 0, forcePerNode ]
        };
      } );

    var load_id = loads.map( function( l ) {
      return l.id;
    } );

    var model = {
      id: 'quads-12345',
      rev: '12123',
      model_builder: { type: 'BasicBuilder', ndm: 2, ndf: 2 },
      materials: [
        mat
      ],
      time_series: [
        { id: 1, type: 'Linear' }
      ],
      nodes: nodes,
      elements: elements,
      single_point_constraints: spcs,
      loads: loads,
      patterns: [
        {
          id: 1, type: 'Plain', time_series_id: 1,
          load_id: load_id
        }
      ],
      analysis: {
        system: { type: 'BandSPD' },
        numberer: { type: 'RCM' },
        constraints: { type: 'Plain' },
        integrator: { type: 'LoadControl', lambda: 0.1 },
        algorithm: { type: 'Linear' },
        analysis: { type: 'Static' }
      }
    }

    var solver = new ISESolver();

    solver
      .model( model )
      .analysisType( 'static' )
      .boilerplate()
      .report([
        { type: 'element_stress' },
        { type: 'element_force' },
        // { type: 'node_disp', nodes: rightEdgeNodesId },
        { type: 'node_disp' },
      ])

    var list = solver._generateAnalyzeCommandsList( 10 );

    // console.log( list.join( '\n' ) );

    solver.on( 'stderr', function( err ) {
      // console.log( 'stderr: ', err );
    } );

    solver.opensees.on( 'data', function( data ) {
      // console.log( 'data: ', data + '' );
    } );

    solver
      .analyze( 10 )
      .then(function( finalState ) {
        expect( Object.keys( finalState.node_disp ).length ).to.be( (nx+1)*(ny+1) );
        expect( Object.keys( finalState.element_force ).length ).to.be( nx*ny );
        expect( Object.keys( finalState.element_stress ).length ).to.be( nx*ny );

        var relative_tol = 0.05;
        var rightEdgeNodeDisps = rightEdgeNodesId.map( function( id ) {
          return finalState.node_disp[ id ]
        } )

        var dy_average = rightEdgeNodeDisps.reduce( function( total, disp ) {
          return disp[ 1 ] + total;
        }, 0 ) / rightEdgeNodeDisps.length;
        var err = Math.abs( ( dy_average - dtipExpect )/dtipExpect );

        console.log( 'computed:', dy_average );
        console.log( 'relative error:', err );
        expect( err ).to.lessThan( relative_tol );
      }, function( err ) {
        // console.log( err );
      }, function( state ) {
        // console.log( 'state', state );
      })
      .done( done, done );
  } );

} );

function block2d( p1, p2, p3, p4, nx, ny ) {
  var arrgen = require( 'arr-gen' );
  var flatten = require( 'flatten' );
  function lerp( p1, p2, r ) {
    var x1= p1.x, x2 = p2.x, y1 = p1.y, y2 = p2.y;
    return { x: x1+(x2-x1)*r, y: y1+(y2-y1)*r };
  }

  nx || ( nx = 10 ), ny || ( ny = 10 );

  var id = 1;
  var nodes = arrgen( nx + 1, ny + 1, function( i, j ) {
    var a = lerp( p1, p4, j/ny );
    var b = lerp( p2, p3, j/ny );
    return { id: id++, position: lerp( a, b, i/nx ) };
  } );

  var id = 1;
  var elements = arrgen( nx, ny, function( i, j ) {
    var n1 = nodes[ i ][ j ].id, n2 = nodes[ i+1 ][ j ].id;
    var n3 = nodes[ i+1 ][ j+1 ].id, n4 = nodes[ i ][ j+1 ].id;
    return { id: id++, type: 'quad', nodes_id: [ n1, n2, n3, n4 ] };
  } );

  return { nodes: flatten( nodes ), elements: flatten( elements ) };
}


// console.log( JSON.stringify( block2d(
//   { x: -400, y: -200 }, { x: 0, y: 0 },
//   { x: 200, y: 300 }, { x: -300, y: 150 }
// ) ) );
