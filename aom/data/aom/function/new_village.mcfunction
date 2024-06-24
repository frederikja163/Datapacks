$execute if data storage aom:data villages.$(village_name) run return run tellraw @p {"text": "Failed to create village $(village_name) another village with the same name already exists, remove the old village before creating a new one", "color": "red"}

$tellraw @a ["A new village has appeared by the name of '$(village_name)'"]

$data modify storage aom:data villages.$(village_name) set value {village_name: "$(village_name)"}

$scoreboard players set $(village_name) aom.villages.building_count 0
$scoreboard players set $(village_name) aom.villages.player_count 0

$data modify storage aom:tmp village_name set value $(village_name)
data modify storage aom:tmp building_name set value "village"
function aom:new_building with storage aom:tmp
${rm aom:tmp village_name}
${rm aom:tmp building_name}