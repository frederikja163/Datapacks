#$data modify storage aom:data villages.$(village_name).$(building_name).placement set value $(placement)
#$data modify storage aom:data villages.$(village_name).$(building_name).building_name set value $(building_name)
#$data modify storage aom:data villages.$(village_name).$(building_name).village_name set value $(village_name)

$tellraw @a "New $(building_name) has been constructed for $(village_name)"
$summon minecraft:marker ~ ~ ~ {data:{aom:{id:"placement",direction:"$(direction)",placement:"$(placement)",building_name:"$(building_name)",village_name:"$(village_name)"}}}