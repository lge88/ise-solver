
module.exports = exports = {
  id: 'quads-12345',
  rev: '12123',
  model_builder: { type: 'BasicBuilder', ndm: 2, ndf: 2 },
  materials: [
    { id: 1, type: 'nD.ElasticIsotropic', E: 3000, v: 0.3 }
  ],
  time_series: [
    { id: 1, type: 'Linear' }
  ],
  nodes: [
    { id: 1, position:{ x:   0, y:  0 } },
    { id: 2, position:{ x: 10, y:  0 } },
    { id: 3, position:{ x: 10, y:  10 } },
    { id: 4, position:{ x:  0, y: 10 } }
  ],
  elements: [
    {
      id: 1, type: 'quad', nodes_id: [ 1, 2, 3, 4 ],
      thick: 0.1, material_id: 1,
      subType: 'PlaneStrain'
    },
  ],
  single_point_constraints: [
    { id: 1, node_id: 1, is_prescribed: [ 1, 1 ] },
    { id: 2, node_id: 2, is_prescribed: [ 1, 1 ] }
  ],
  loads: [
    { id: 1, node_id: 4, type: 'NodalForce', value: [ 100, 0 ] }
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
