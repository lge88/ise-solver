
var express = require( 'express' );
var sh = require( 'shelljs' );
var port = 3000;
// var ns = '/solve';

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

var io = require( 'socket.io' )
  .listen( server )
  .set( 'log level', 0 )
  // .of( ns );

// var n1 = new ISESolverIOServer( { id: 1 });
// var n2 = new ISESolverIOServer( { id: 2 });
// var n3 = new ISESolverIOServer( { id: 3 });
// var n4 = new ISESolverIOServer( { id: 4 });
// var n5 = new ISESolverIOServer( { id: 5 });
// var nodes = [];
// var count = 0;

// io.on( 'connection', function( socket ) {
  // var node = new ISESolverIOServer( { id: count++ } );
  // var binding = node.serve( socket );
  // nodes.push( binding );
  // console.log( id );
  // console.log( nodes );
// } );

server.listen( port );
