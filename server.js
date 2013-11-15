
var express = require( 'express' );
var sh = require( 'shelljs' );
var arrgen = require( 'arr-gen' );

var ISESolver = require( './lib' );
var ISESolverIOServer = require( './lib' ).io.Server;

// ISESolver.OpenSees.dataPort = 8005;
var port = 3000;
var ns = '/solve';


var app = express();
var server = require( 'http' ).createServer( app );

app
  .get(
    '/*',
    function( req, res, next ) {
      if ( req.query.rebuild ) {
        console.log( 'make' );
        sh.exec( 'make' );
      }
      next();
    },
    express.static( __dirname ),
    express.directory( __dirname )
  );

// var io = require( 'socket.io' )
//   .listen( server )
//   .set( 'log level', 0 )

var io = require( 'socket.io' )
  .listen( server )
  .set( 'log level', 0 )
  .of( ns );

// FIXME: so the server do not work if
// numOfNodes > 4
var numOfNodes = 10;
var nodes = arrgen( numOfNodes, function( i ) {
  return new ISESolverIOServer( { id: i } );
} );
var bindings = [];

function sample( list ) {
  var len = list.length;
  return list[ Math.floor( Math.random()*len ) ];
}

io.on( 'connection', function( socket ) {
  // new IOServer Object contains a spawned process;
  var node = sample( nodes );
  var binding = node.serve( socket );
  bindings.push( binding );
  console.log( 'served by node ' + node.id );
} );

server.listen( port );
