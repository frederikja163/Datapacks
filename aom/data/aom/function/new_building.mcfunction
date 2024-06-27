$data modify storage aom:data villages.$(village_name).$(building_name).village_name set value "$(village_name)"
$data modify storage aom:data villages.$(village_name).$(building_name).building_name set value "$(building_name)"

$execute store result storage aom:tmp result int 1 run function aom:buildings/$(building_name)/ with storage aom:data villages.$(village_name).$(building_name)
execute if data storage aom:tmp {result:0} run tellraw @a {"text": "Couldn't create building","color":"red"}
execute if data storage aom:tmp {result:0} run return run data remove storage aom:data villages.$(village_name).$(building_name)
$function aom:new_placement/ with storage aom:data villages.$(village_name).$(building_name)