set __DATA_STREAM_FD 1
wipe
model BasicBuilder -ndm 2 -ndf 2
timeSeries Linear 1
uniaxialMaterial Elastic 1 3000
node 1 0 0
node 2 144 0
node 3 168 0
node 4 72 96
fix 1 1 1
fix 2 1 1
fix 3 1 1
element truss 1 1 4 10 1
element truss 2 2 4 5 1
element truss 3 3 4 5 1
pattern Plain 1 1 {
load 4 100 -50
}
system BandSPD
constraints Plain
numberer RCM
algorithm Linear
integrator LoadControl 0.1
analysis Static
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
analyze 1
puts $__DATA_STREAM_FD [nodalDispToJSON [getNodeTags]]
