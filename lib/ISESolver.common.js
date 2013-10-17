
exports.model = function( m ) {
  if ( !m ) {
    return this._model;
  } else {
    this._model = m;
    this._model.history || ( this._model.history = {} );
    this._model.state || ( this._model.state = {} );
    return this;
  }
};

exports.analysisType = function( type ) {
  if ( !type ) {
    return this._model.analysis.type;
  } else {
    this._model.analysis.type = type;
    return this;
  }
};

exports.report = function( recorders ) {
  Array.isArray( recorders ) || ( recorders = [ recorders ] );
  var _this = this;
  this.recorders = [];
  recorders.filter(function( x ) {
    return x && x.type;
  }).forEach(function( x ) {
    _this.recorders.push( x );
  });
  return this;
};

exports.boilerplate = function( t ) {
  var type = t || this._model.analysis.analysis.type;
  var model = this._model;
  if ( type.match( /[Ss]tatic/ ) ) {
    model.analysis = {
      system: { type: 'BandSPD' },
      numberer: { type: 'RCM' },
      constraints: { type: 'Plain' },
      integrator: { type: 'LoadControl', lambda: 0.1 },
      algorithm: { type: 'Linear' },
      analysis: { type: 'Static' },
      analyze: { steps: 10 }
    };
  } else if ( type.match( /[Dd]ynamic/ ) ) {
    model.analysis = {
      constraints: { type: 'Transformation' },
      numberer: { type: 'RCM' },
      system: { type: 'BandSPD' },
      test: { type: 'NormUnbalance', tolerance: 0.1, maxIteration:200 },
      algorithm: { type: 'Newton', useInitialThenCurrentStiffness: true },
      integrator: { type: 'Newmark', gamma: 0.5, beta: 0.25 },
      analysis: { type: 'Transient' },
      analyze: { steps: 1, dt: 0.01 }
    };
  } else if ( type.match( /[Ee]igen/ ) ) {
    model.analysis.eigen || ( this.model.analysis.eigen = {} );
    model.analysis.eigen = {
      numOfEigenValues: 1
    };
  }
  return this;
};
