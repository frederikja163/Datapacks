$execute if score $(village_name) aom.villages.villager_count matches 0..0 run tellraw @s {"text":"You don't have any unemployed villagers, and you can't remove employed villagers.","color":"red"}
$execute if score $(village_name) aom.villages.villager_count matches 0..0 run return 0
$scoreboard players remove $(village_name) aom.villages.villager_count 1
return 1