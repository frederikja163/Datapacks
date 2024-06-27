$execute at @e[$<placement_selector placement>] run setblock ~ ~ ~ minecraft:air
$kill @e[$<placement_selector placement>]
$tellraw @a "A $(building_name) has been destroyed in $(village_name)"
$scoreboard players remove $(village_name) aom.buildings.$(building_name)_count 1
$function aom:buildings/$(building_name)/placement/delete with storage aom:data villages.$(village_name).$(building_name).$(placement)
$data remove storage aom:data villages.$(village_name).$(building_name).$(placement)