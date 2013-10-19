wipe
model BasicBuilder -ndm 2 -ndf 2
timeSeries Linear 1
nDMaterial ElasticIsotropic 1 3000 0.3
node 1 0 0
node 2 10 0
node 3 10 10
node 4 0 10
fix 1 1 1
fix 2 1 1
element quad 1 1 2 3 4 0.1 "PlaneStrain" 1
# element quad 1 1 2 3 4 0.1 1
pattern Plain 1 1 {
    load 4 100 0
}
system BandSPD
constraints Plain
numberer RCM
algorithm Linear
integrator LoadControl 0.1
analysis Static
analyze 1
