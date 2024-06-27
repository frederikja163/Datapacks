$execute store result storage aom:tmp new_placement.placement int 1 run scoreboard players add $(village_name) aom.buildings.$(building_name)_acc 1
$scoreboard players add $(village_name) aom.buildings.$(building_name)_count 1
$data modify storage aom:tmp new_placement.village_name set value "$(village_name)"
$data modify storage aom:tmp new_placement.building_name set value "$(building_name)"

function aom:new_placement/place_marker with storage aom:tmp new_placement
${rm aom:tmp new_placement}
