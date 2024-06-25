$execute store result storage aom:tmp new_placement.placement int 1 run scoreboard players add $(village_name) aom.villages.$(building_name)_count 1
$data modify storage aom:tmp new_placement.village_name set value "$(village_name)"
$data modify storage aom:tmp new_placement.building_name set value "$(building_name)"
execute as @s[y_rotation=45..135] run data modify storage aom:tmp new_placement.direction set value "east"
execute as @s[y_rotation=-135..-45] run data modify storage aom:tmp new_placement.direction set value "west"
execute as @s[y_rotation=135..-135] run data modify storage aom:tmp new_placement.direction set value "south"
execute as @s[y_rotation=-45..45] run data modify storage aom:tmp new_placement.direction set value "north"

function aom:place_marker with storage aom:tmp new_placement
${rm aom:tmp new_placement}
