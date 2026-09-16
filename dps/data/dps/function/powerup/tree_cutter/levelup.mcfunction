$scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown

$scoreboard players operation @s dps_tmp = @s $(skill)_charges_max
$scoreboard players operation @s $(skill)_charges_max = @s $(skill)_level
$scoreboard players operation @s $(skill)_charges_max /= 100 dps_globals
$scoreboard players add @s $(skill)_charges_max 1
$execute unless score @s dps_tmp = @s $(skill)_charges_max run tellraw @s ["    ", {text:"Tree cutter", color: gold}, " ", {score:{name:"@s",objective:"dps_tmp"},color:aqua}, {text:"⚡", color: yellow}, {text:" → ", color: white}, {score:{name:"@s",objective:"$(skill)_charges_max"},color:aqua}, {text:"⚡", color: yellow}]

$scoreboard players operation @s dps_tmp = @s $(skill)_cooldown_max
$scoreboard players operation @s $(skill)_cooldown_max = @s $(skill)_level
$scoreboard players operation @s $(skill)_cooldown_max /= 2 dps_globals
$scoreboard players remove @s $(skill)_cooldown_max 300
$scoreboard players operation @s $(skill)_cooldown_max *= -1 dps_globals
$execute unless score @s dps_tmp = @s $(skill)_cooldown_max run tellraw @s ["    ", {text:"Tree cutter", color: gold}, {text:" ⏳", color:red}, {score:{name:"@s",objective:"dps_tmp"},color:aqua}, {text:"s", color: aqua}, {text:" → ", color: white}, {text:" ⏳", color:red}, {score:{name:"@s",objective:"$(skill)_cooldown_max"},color:aqua}]
