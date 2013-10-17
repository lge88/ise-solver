proc trimIt x { return [string trim $x] }
proc map {fun list} {
    set res {}
    foreach element $list {lappend res [$fun $element]}
    set res
}

proc node_disp_to_json {nlist} {
    set res "{"
    append res "\"time\":[getTime],"
    append res "\"type\":\"node_disp\","
    append res "\"data\":\{"
    set len [llength $nlist]
    puts "len: $len"
    for {set k 0} {$k < [expr $len-1]} {incr k} {
        set i [lindex $nlist $k]
        append res "\"$i\":\["
        append res "[join [nodeDisp $i] ,]"
        append res "\]"
        append res ","
    }
    set i [lindex $nlist $k]
    append res "\"$i\":\["
    append res "[join [nodeDisp $i] ,]"
    append res "\]"
    append res "\}"
    append res "}"
    return $res;
}

proc element_force_to_json {nlist} {
    set res "{"
    append res "\"time\":[getTime],"
    append res "\"type\":\"element_force\","
    append res "\"data\":\{"
    set len [llength $nlist]
    for {set k 0} {$k < [expr $len-1]} {incr k} {
        set i [lindex $nlist $k]
        append res "\"$i\":\["
        append res "[join [eleResponse $i forces] ,]"
        append res "\]"
        append res ","
    }
    set i [lindex $nlist $k]
    set coord [map trimIt [split [nodeDisp $i]]]
    append res "\"$i\":\["
    append res "[join [eleResponse $i forces] ,]"
    append res "\]"
    append res "\}"
    append res "}"
    return $res;
}
