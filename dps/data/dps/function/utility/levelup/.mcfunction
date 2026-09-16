# Has player leveled up.
$execute if score @s $(skill)_xp < @s $(skill)_req run return fail

# level up
$scoreboard players operation @s $(skill)_xp -= @s $(skill)_req
$scoreboard players add @s $(skill)_level 1
scoreboard players add @s dps_total_level 1

# normal
scoreboard players set @s dps_lvl_up_type 0
# minor
$scoreboard players operation @s dps_tmp = @s $(skill)_level
scoreboard players operation @s dps_tmp %= 10 dps_globals
execute if score @s dps_tmp matches 0..0 run scoreboard players set @s dps_lvl_up_type 1
#mayor
$scoreboard players operation @s dps_tmp = @s $(skill)_level
scoreboard players operation @s dps_tmp %= 100 dps_globals
execute if score @s dps_tmp matches 0..0 run scoreboard players set @s dps_lvl_up_type 2

execute as @s at @s run function dps:utility/levelup/playsound
$function dps:utility/levelup/announce {skill: "$(skill)"}
$function $(success) {skill: "$(skill)"}
$function dps:utility/calc_percentage {skill: "$(skill)"}

scoreboard players set @s dps_lvl_up_type 0

# Calculate new requirement.
$scoreboard players operation @s $(skill)_req = @s $(skill)_level

$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req *= 2 dps_globals
$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req += 7 dps_globals

$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req *= 5 dps_globals
$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req -= 38 dps_globals

$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req *= 9 dps_globals
$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req -= 158 dps_globals