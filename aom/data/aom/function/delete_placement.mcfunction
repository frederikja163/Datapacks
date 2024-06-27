${st_uuid aom:tmp delete_placement.uuid}
$data modify storage aom:tmp delete_placement.village_name set value $(village_name)
execute store result storage aom:tmp result int 1 run function aom:player_in_village with storage aom:tmp delete_placement
execute if data storage aom:tmp {result:0} run tellraw @a {"text":"Must be part of village to remove building","color":"red"}
execute if data storage aom:tmp {result:0} run return run data remove storage aom:tmp delete_placement
#${rm aom:tmp delete_placement}

$execute store result storage aom:tmp result int 1 run function aom:buildings/$(building_name)/placement/delete with storage aom:data villages.$(village_name).$(building_name).$(placement)
execute if data storage aom:tmp {result:0} run tellraw @a {"text":"Couldn't delete building.","color":"red"}
execute if data storage aom:tmp {result:0} run return run data remove storage aom:tmp delete_placement
$tellraw @a [{"text":"A $(building_name) has been destroyed in $(village_name) by ","color":"gray"},{"selector":"@s"}]

$execute at @e[$<placement_selector placement>] run setblock ~ ~ ~ minecraft:air
$kill @e[$<placement_selector placement>]
$scoreboard players remove $(village_name) aom.buildings.$(building_name)_count 1
$data remove storage aom:data villages.$(village_name).$(building_name).$(placement)