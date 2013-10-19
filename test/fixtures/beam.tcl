
set p -100e3
set E 200.0e9
set b 0.10
set h 0.10
set I [expr $b*$h*$h*$h/12]
set A [expr $b*$b]
set l 1.0
set dtipExpect [expr $p*$l*$l*$l/3/$E/$I]

wipe;
model basic -ndm 2 -ndf 3

geomTransf Linear 1;
geomTransf PDelta 2;
geomTransf Corotational 3;

node 1 0 0;
node 2 $l 0;

element elasticBeamColumn 1 1 2 $A $E $I 3;

fix 1 1 1 1;

timeSeries Linear 1;
pattern Plain 1 1 {
    load 2 0 $p 0
}

system BandSPD
constraints Plain
numberer RCM
algorithm Linear
integrator LoadControl 0.1
analysis Static
analyze 10

puts "dtipCal:[nodeDisp 2 2]"
puts "dtipExpect:$dtipExpect"
