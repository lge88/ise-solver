
module.exports = exports = {
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
