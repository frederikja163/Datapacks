# TODO: Check if village name already exists.
$tellraw @a ["A new village has appeared by the name of '$(village_name)'"]

$data modify storage aom:data villages.$(village_name) set value {village_name: "$(village_name)"}

$scoreboard players set $(village_name) aom.villages.building_count 0
$scoreboard players set $(village_name) aom.villages.player_count 0

$data modify storage aom:tmp village_name set value $(village_name)
data modify storage aom:tmp building_name set value "village"
function aom:new_building with storage aom:tmp
${rm aom:tmp village_name}
${rm aom:tmp building_name}