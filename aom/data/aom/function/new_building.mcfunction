$data modify storage aom:data villages.$(village_name).$(building_name).village_name set value "$(village_name)"
$data modify storage aom:data villages.$(village_name).$(building_name).building_name set value "$(building_name)"

$function aom:$(building_name)/ with storage aom:data villages.$(village_name).$(building_name)
$function aom:new_placement/ with storage aom:data villages.$(village_name).$(building_name)