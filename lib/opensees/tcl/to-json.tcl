proc nodalDispToJSON {nlist} {
    set res "{"
    append res "\"time\":[getTime],"
    append res "\"type\":\"NodalDisplacements\","
    append res "\"data\":\["
    proc trimIt x { return [string trim $x] }
    proc map {fun list} {
        set res {}
        foreach element $list {lappend res [$fun $element]}
        set res
    }
    set len [llength $nlist]
    for {set k 0} {$k < [expr $len-1]} {incr k} {
        set i [lindex $nlist $k]
        set coord [map trimIt [split [nodeDisp $i]]]
        append res "$i,"
        append res "[join [nodeDisp $i] ,]"
        append res ","
    }
    set i [lindex $nlist $k]
    set coord [map trimIt [split [nodeDisp $i]]]
    append res "$i,"
    append res "[join [nodeDisp $i] ,]"
    append res "\]"
    append res "}"
    return $res;
}

# proc nodalDispToJSON {nlist type} {
#     set res "{"
#     append res "\"time\":[getTime],"
#     append res "\"type\":\"NodalDisplacement\","
#     append res "\"data\":\["
#     proc trimIt x { return [string trim $x] }
#     proc map {fun list} {
#         set res {}
#         foreach element $list {lappend res [$fun $element]}
#         set res
#     }
#     set len [llength $nlist]
#     for {set k 0} {$k < [expr $len-1]} {incr k} {
#         set i [lindex $nlist $k]
#         set coord [map trimIt [split [nodeDisp $i]]]
#         append res "$i,"
#         append res "[join [nodeDisp $i] ,]"
#         append res ","
#     }
#     set i [lindex $nlist $k]
#     set coord [map trimIt [split [nodeDisp $i]]]
#     append res "$i,"
#     append res "[join [nodeDisp $i] ,]"
#     append res "\]"
#     append res "}"
#     return $res;
# }
