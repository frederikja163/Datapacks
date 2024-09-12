$execute if score $(village_name) aom.villages.villager_count matches 0..0 run tellraw @s {"text":"You don't have any unemployed villagers.","color":"red"}
$execute if score $(village_name) aom.villages.villager_count matches 0..0 run return 0

# Add 1 clerk
$execute store result score tmp aom.globals run data get storage aom:data villages.$(village_name).$(building_name).oak.clerks
scoreboard players add tmp aom.globals 1
$execute store result storage aom:data villages.$(village_name).$(building_name).oak.clerks int 1 run scoreboard players get tmp aom.globals
scoreboard players reset tmp aom.globals

# Add 1000 storage
$execute store result score tmp aom.globals run data get storage aom:data villages.$(village_name).$(building_name).oak.max_items
scoreboard players add tmp aom.globals 1000
$execute store result storage aom:data villages.$(village_name).$(building_name).oak.max_items int 1 run scoreboard players get tmp aom.globals
scoreboard players reset tmp aom.globals

$scoreboard players remove $(village_name) aom.villages.villager_count 1
$tellraw @a [{"selector":"@s","color":"green"}," hired an oak clerk for $(village_name)."]