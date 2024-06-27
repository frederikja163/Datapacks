$data modify storage aom:data villages.$(village_name).$(building_name).$(placement).placement set value $(placement)
$data modify storage aom:data villages.$(village_name).$(building_name).$(placement).building_name set value $(building_name)
$data modify storage aom:data villages.$(village_name).$(building_name).$(placement).village_name set value $(village_name)

$execute as @s[y_rotation=45..135] run data modify storage aom:data villages.$(village_name).$(building_name).$(placement).direction set value "east"
$execute as @s[y_rotation=-135..-45] run data modify storage aom:data villages.$(village_name).$(building_name).$(placement).direction set value "west"
$execute as @s[y_rotation=135..-135] run data modify storage aom:data villages.$(village_name).$(building_name).$(placement).direction set value "south"
$execute as @s[y_rotation=-45..45] run data modify storage aom:data villages.$(village_name).$(building_name).$(placement).direction set value "north"

$tellraw @a "A new $(building_name) has been constructed in $(village_name)"
$summon minecraft:marker ~ ~ ~ {data:{aom:{id:"placement",placement:"$(placement)",building_name:"$(building_name)",village_name:"$(village_name)"}}}
$function aom:buildings/$(building_name)/placement/ with storage aom:data villages.$(village_name).$(building_name).$(placement)