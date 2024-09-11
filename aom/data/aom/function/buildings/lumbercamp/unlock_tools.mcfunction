$execute if data storage aom:data {villages:{$(village_name):{unlocks:{wooden_tools:"true"}}}} run tellraw @s {"text":"Wooden tools already unlocked","color":"red"}
$execute if data storage aom:data {villages:{$(village_name):{unlocks:{wooden_tools:"true"}}}} run return 0

$execute if score $(village_name) aom.villages.villager_count matches 0..0 run tellraw @s {"text":"You don't have any unemployed villagers.","color":"red"}
$execute if score $(village_name) aom.villages.villager_count matches 0..0 run return 0

$data modify storage aom:data villages.$(village_name).unlocks.wooden_tools set value "true"
$scoreboard players remove $(village_name) aom.villages.villager_count 1
$tellraw @a [{"selector":"@s","color":"green"}," unlocked wooden tools for $(village_name)."]
execute as @a run function aom:update_player/