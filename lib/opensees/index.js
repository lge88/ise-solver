var _ = require('underscore');
var child_process = require('child_process');
var spawn = child_process.spawn;
var path = require( 'path' );
var net = require( 'net' );
var EventEmitter = require( 'events' ).EventEmitter;
var debug = require( 'debug' )( 'opensees' );
var Q = require( 'q' );
var extend = require( 'extend' );

var defaults = {
  executable : 'OpenSees',
  executeArgs : ['--no-prompt'],
  autoRestart : true,
  tclDir : path.resolve(__dirname + '/tcl'),
  initScript : 'init.tcl'
};

function OpenSees( options ) {
  options || ( options = {} );
  this.options = extend( {}, defaults, options );
  var self = this;
  this.interpreter = spawn(this.options.executable, this.options.executeArgs);
  this.interpreter.stdout.on('data', function(data){
    self.emit('stdout', data.toString());
  });
  this.interpreter.stderr.on('data', function(data){
    self.emit('stderr', data.toString());
    // console.log( data + '');
  });
  this.interpreter.on('exit', function(code, sig){
    self.emit('exit', code, sig);
    // console.log( self.id + ' is dead', code, sig );

  });
  this.id = uuid();
  this.init();
};

OpenSees.prototype.__proto__ = EventEmitter.prototype;

OpenSees.prototype.init = function() {
  var _this = this;
  // this.id = uuid();
  exports.nodes[ this.id ] = this;
  this.dataPort = exports.dataPort;
  this.interp( 'cd ' + _this.options.tclDir );
  this.interp('source ' + _this.options.tclDir + '/' + _this.options.initScript);
  this.interp('set __DATA_STREAM_FILE "' + _this.dataPipe + '"');
   // _this.interp('set __DATA_STREAM_FD [open "' + _this.dataPipe + '" "w"]');
  this.interp('set __DATA_STREAM_FD [socket localhost ' + _this.dataPort + ']');
  this.interp('puts $__DATA_STREAM_FD ' + _this.id );
  this.interp('flush $__DATA_STREAM_FD' );
  this.interp('source ' + _this.options.tclDir + '/to-json.tcl');
};

OpenSees.prototype.exportDomainCmd = function() {
  return 'puts [json-echo-domain]';
};

OpenSees.prototype.writeDataCmd = function() {
  return 'puts $__DATA_STREAM_FD';
};

OpenSees.prototype.flushDataCmd = function() {
  return 'flush $__DATA_STREAM_FD';
};

OpenSees.prototype.interp = function(str) {
  this.interpreter.stdin.write(str + '\n');
  this.emit('command', str);
};

OpenSees.prototype.recordNodalDisplacementsCmd = function( nodeList ) {
  var lst = [], cmd = '';
  if ( !nodeList ) {
    lst = 'getNodeTags';
  } else {
    lst.push( 'list' );

    nodeList.forEach(function( x ) {
      lst.push( x );
    });
    lst = lst.join( ' ' );
  }
  cmd = 'puts $__DATA_STREAM_FD [node_disp_to_json [' + lst + ']]';
  return cmd;
};

OpenSees.prototype.recordElementForcesCmd = function( elementList ) {
  var lst = [], cmd = '';
  if ( !elementList ) {
    lst = 'getEleTags';
  } else {
    lst.push( 'list' );
    elementList.forEach(function( x ) {
      lst.push( x );
    });
    lst = lst.join( ' ' );
  }
  cmd = 'puts $__DATA_STREAM_FD [element_force_to_json [' + lst + ']]';
  return cmd;
};


OpenSees.prototype.formatCommand = formatCommand;
function formatCommand(str) {
  var cmds=[];
  var cmd;
  var result = '';
  str.trim().split(/[\n;]/).forEach(function(s) {
        var cmd = s.trim().replace(/\s+/g, ' ');
    if (cmd !== '' && cmd[0] !== '#') {
      cmds.push(cmd);
    }
  });
  for (var i = -1, len = cmds.length; ++i < len;) {
    cmd = cmds[i].trim();
    result += cmd + ';';
  }
  result += "\n";
  return result;
}

module.exports = OpenSees;
exports.dataPort = 8125;
exports.nodes = {};

var maxCount = 0;
function uuid() {
  return '' + (maxCount++);
  // return Date.now() + '';
}

function initDataPort() {
  var port = exports.dataPort;
  var nodes = exports.nodes;
  var server = net.createServer(function( c ) {
    c.on( 'data', onInit );

    function onInit( data ) {
      var id = ( data + '' ).trim();
      var node = nodes[ id ];
      if ( typeof node !== 'undefined' ) {
        node._socket = c;
        c._node = node;
        c.removeListener( 'data', onInit );
        c.on( 'data', onRunning );
        node.emit( 'ready' );
      } else {
        c.end();
      }
    }

    function onRunning( data ) {
      var node = c._node;
      if ( node ) {
        node.emit( 'data', data );
      }
    }
  });
  server.listen( port );
}

initDataPort();
