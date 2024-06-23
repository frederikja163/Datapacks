function aom:set_lectern

$${ld_a aom:$(village_index) building_count}
${incr_a 1}
$${st_a aom:$(village_index) building_count}

$data modify storage aom:$(village_index) $(building_count).village_index set value "$(village_index)"
$data modify storage aom:$(village_index) $(building_count).building_index set value "$(building_count)"
$data modify storage aom:$(village_index) $(building_count).building_type set value $(building_type)
$data modify storage aom:$(village_index) $(building_count).book_function set value "$(book_function)"
$data modify storage aom:$(village_index) $(building_count).x set from storage aom:globals x
$data modify storage aom:$(village_index) $(building_count).y set from storage aom:globals y
$data modify storage aom:$(village_index) $(building_count).z set from storage aom:globals z

$function aom:village/update_book with storage aom:$(village_index) $(building_count)