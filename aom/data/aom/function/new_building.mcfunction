execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=45..135] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=east]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=-135..-45] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=west]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=135..-135] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=south]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=-45..45] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=north]

$data modify storage aom:data villages.$(village_name).$(building_name).village_name set value "$(village_name)"
$data modify storage aom:data villages.$(village_name).$(building_name).building_name set value "$(building_name)"
$data modify storage aom:data villages.$(village_name).$(building_name).x set from block ~ ~ ~ x
$data modify storage aom:data villages.$(village_name).$(building_name).y set from block ~ ~ ~ y
$data modify storage aom:data villages.$(village_name).$(building_name).z set from block ~ ~ ~ z

$tellraw @a "New $(building_name) has been constructed for $(village_name)"

$function aom:update_book with storage aom:data villages.$(village_name).$(building_name)