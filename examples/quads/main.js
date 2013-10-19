
var ISESolver = require( 'ise-solver' );
var ISEViewport = require( 'ise-viewport' );
var EditorControls = require( 'ise-editor-controls' );
var arrgen = require( 'arr-gen' );
var THREE = require( 'three' );
var normalizeGeometry = require( 'three-normalize-geometry' );
var GUI = require( 'dat-gui' ).GUI;

var io = window.io;
var port = 3000;
var ns = '/solve';
var socket = io.connect( 'http://localhost:' + port + ns );

var viewport = ISEViewport();
var controls = EditorControls( viewport.camera, viewport.container );
var scene = viewport.scene;
var sceneHelpers = viewport.sceneHelpers;
var camera = viewport.camera;

var p = 100e3;
var E = 200.0e9;
var b = 0.250;
var l = 1.0;
var v = 0.3;

var A = b*b;
var h = b;
var I = b*h*h*h/12;
var dtipExpect = p*l*l*l/3/E/I;

console.log( 'expect', dtipExpect );

var blk = block2d(
  { x: 0, y: 0 }, { x: l, y: 0 },
  { x: l, y: h }, { x: 0, y: h },
  50,
  20
);

var mat = {
  id: 1, type: 'nD.ElasticIsotropic',
  E: E, v: v
};

function linearMap( range1, range2 ) {
  if ( !range2 ) {
    range2 = range1;
    range1 = [ 0, 1 ];
  }
  var a = range1[0];
  var b = range2[0];
  var d1 = range1[1] - range1[0];
  var d2 = range2[1] - range2[0];
  return function( x ) {
    return b + ( x - a ) * d2 / d1;
  };
}

var nodes = blk.nodes

var leftEdgeNodesId = nodes
  .filter( function( n ) {
    var p = n.position;
    return p.x < 0.01 && p.x > - 0.01;
  } )
  .map( function( n ) {
    return n.id;
  } );

var rightEdgeNodesId = nodes
  .filter( function( n ) {
    var p = n.position;
    return p.x < l + 0.01 && p.x > l - 0.01;
  } )
  .map( function( n ) {
    return n.id;
  } );


var f1 = linearMap( [ 0, l ], [ Math.PI/2, -Math.PI/2 ] ) ;
var f2 = linearMap( [ 0, h ], [ 1*h, 3*h ] ) ;

function toArc( n ) {
  var p = n.position, newP = {};
  var t = f1( p.x );
  var r = f2( p.y );

  newP.x = r*Math.cos( t );
  newP.y = r*Math.sin( t );
  newP.z = 0;
  n.position = newP;
  return n;
}

nodes = nodes.map( toArc )

var elements = blk.elements
  .map( function( el ) {
    el.thick = b;
    el.material_id = 1;
    el.subType = 'PlaneStress';
    return el;
  } );


var idCount = 0;
var spcs = leftEdgeNodesId
  .map( function( nid ) {
    return {
      id: ++idCount, node_id: nid,
      is_prescribed: [ 1, 1 ]
    };
  } )
  // .concat( rightEdgeNodesId.map( function( nid ) {
  //   return {
  //     id: ++idCount, node_id: nid,
  //     is_prescribed: [ 0, 1 ]
  //   };
  // } ) )

var forcePerNode = p / rightEdgeNodesId.length;
var idCount = 0;
var loads = rightEdgeNodesId
  .map( function( nid ) {
    return {
      id: ++idCount, node_id: nid,
      type: 'NodalForce',
      // value: [ forcePerNode, 0 ],
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
};

var solver = new ISESolver( socket );
var referenced = drawBlock( blk );
referenced.scale.set( 400, 400, 400 );
scene.add( referenced );
var deformed;
var stressed;
// var deformScale = 200;
// var solver = new ISESolver();
var demoOptions = {
  referenced: true,
  deformed: true,
  stress: true,
  'arc domain': true,
  'deformation scale': 200
}

var gui = new GUI();
gui.add( demoOptions, 'deformed' ).onChange( function( v ) {
  deformed.visible = v;
} );
gui.add( demoOptions, 'referenced' ).onChange( function( v ) {
  referenced.visible = v;
} );
gui.add( demoOptions, 'stress' ).onChange( function( v ) {
  stressed.visible = v;
} );
solver
  .model( model )
  .analysisType( 'static' )
  .boilerplate()
  .report([
    // { type: 'element_force', elements: [ 1 ] },
    { type: 'element_stress' },
    // { type: 'node_disp', nodes: rightEdgeNodesId },
    { type: 'node_disp' },
  ])
  .analyze( 10 )
  .done(function( finalState ) {
    var node_disp = finalState.node_disp;
    var element_stress = finalState.element_stress;

    stressField = makeStressField( blk, element_stress );
    stressed = drawStressField( blk, stressField );
    stressed.scale.set( 400, 400, 400 );
    scene.add( stressed );
    console.log( element_stress );

    deformed = drawDeformed( blk, node_disp );
    deformed.scale.set( 400, 400, 400 );
    scene.add( deformed );

  }, function( err ) {
    console.log( err );
    // console.log( err );
  }, function( state ) {
    // console.log( 'state', state );
  });

function flatten( tree, shallow, list ) {
  list || ( list = [] );
  tree.forEach( function( el ) {
    if ( Array.isArray( el ) ) {
      shallow ?
        el.forEach( function( x ) { list.push( x ); } ) :
      flatten( el, false, list );
    } else {
      list.push( el );
    }
  } );
  return list;
}

function block2d( p1, p2, p3, p4, nx, ny ) {
  var arrgen = require( 'arr-gen' );
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

function drawBlock( blk ) {
  var geo = new THREE.Geometry();
  geo.vertices = blk.nodes.map( function( n ) {
    n.position.z = 0;
    return ( new THREE.Vector3() ).copy( n.position );
  } );
  // geo = normalizeGeometry( geo, 'max', 400 );
  var mat = new THREE.ParticleBasicMaterial( {
    color: 0xff00cc,
    size: 5
  } );
  var referenced = new THREE.ParticleSystem( geo, mat );
  return referenced;
}

function drawDeformed( blk, nodeDisp ) {
  var geo = new THREE.Geometry();
  // var range = Object
  //   .keys( nodeDisp )
  //   .reduce( function( obj, k ) {
  //     var disp = nodeDisp[ k ];
  //     if
  //   }, { min: Infinity, max: -Infinity } );
  var s = demoOptions['deformation scale'];
  geo.vertices = blk.nodes.map( function( n ) {
    n.position.z = 0;
    var disp = nodeDisp[ n.id ];
    var vec = ( new THREE.Vector3() ).copy( n.position );
    if ( disp ) {
      vec.add( {
        x: disp[0] * s,
        y: disp[1] * s,
        z: 0
      } );
    }
    return vec;
  } );
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  var mat = new THREE.ParticleBasicMaterial( {
    color: 0x0000cc,
    size: 5
  } );
  var referenced = new THREE.ParticleSystem( geo, mat );
  return referenced;
}

function makeStressField( blk, stresses ) {
  var field = {}, elements = blk.elements;
  Object
    .keys( stresses )
    .map( function( x ) { return parseInt(x); } )
    .filter( function( x ) { return !isNaN(x); } )
    .forEach( function( k ) {
      var s = stresses[ k ];
      var nids = elements[ k - 1 ].nodes_id;
      nids.forEach( function( nid, ind ) {
        if ( !field[ nid ] ) {
          field[ nid ] = [ s[3*ind], s[3*ind+1], s[3*ind+2] ];
        } else {
          field[ nid ].forEach( function( val, i, arr ) {
            arr[ ind ] = val + s[3*ind+i];
          } );
        }
      } );
    } );
  return field;
}


// Returns the appropriate value from the Jet color function.
function getJetColor( value ) {
  var fourValue = 4 * value;
  var min = Math.min;
  var red   = min(fourValue - 1.5, -fourValue + 4.5);
  var green = min(fourValue - 0.5, -fourValue + 3.5);
  var blue  = min(fourValue + 0.5, -fourValue + 2.5);
  return clamp( [red, green, blue], 0.0, 1.0 );
}

function clamp( arr, low, high ) {
  return arr.map( function( x ) {
    if ( x < low ) {
      return low;
    } else if ( x > high ) {
      return high;
    } else {
      return x;
    }
  } );
}

function normalize( vector ) {
  var min = Infinity, max = -Infinity;
  vector.forEach( function( v ) {
    ( v > max ) && ( max = v );
    ( v < min ) && ( min = v );
  } );
  var d = max - min;
  return vector.map( function( v ) {
    return (v - min) / d;
  } );
}


function drawStressField( blk, field ) {
  var geo = new THREE.Geometry();
  geo.vertices = blk.nodes.map( function( n ) {
    n.position.z = 0;
    return ( new THREE.Vector3() ).copy( n.position );
  } );

  var colors = normalize(
    Object
      .keys( field )
      .map( function( k ) {
        var sigmas = field[ k ];
        return sigmas[0];
      } )
  )

  colors = colors.map(function( x ) {
    var c = getJetColor( x );
    var cl = new THREE.Color();
    cl.r = c[0];
    cl.g = c[1];
    cl.b = c[2];
    return cl;
  });

  var faces = geo.faces;

  blk.elements.forEach( function( el ) {
    var nids = el.nodes_id.map( function( x ) { return x-1; } );
    var i1 = nids[0], i2 = nids[1], i3 = nids[2], i4 = nids[3];
    var f1 = new THREE.Face3( i1, i2, i3 );
    var f2 = new THREE.Face3( i3, i4, i1 );

    faces.push( f1 );
    faces.push( f2 );

    f1.vertexColors[ 0 ] = colors[ i1 ];
    f1.vertexColors[ 1 ] = colors[ i2 ];
    f1.vertexColors[ 2 ] = colors[ i3 ];

    f2.vertexColors[ 0 ] = colors[ i3 ];
    f2.vertexColors[ 1 ] = colors[ i4 ];
    f2.vertexColors[ 2 ] = colors[ i1 ];
  } );

  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  geo.computeCentroids();
  geo.computeFaceNormals();
  geo.computeVertexNormals();

  // geo = normalizeGeometry( geo, 'max', 400 );
  // var mat = new THREE.ParticleBasicMaterial( {
  var mat = new THREE.MeshBasicMaterial( {
    // color: 0xff00cc,
    vertexColors: THREE.VertexColors
    // size: 5
  } );
  var referenced = new THREE.Mesh( geo, mat );
  return referenced;
}
