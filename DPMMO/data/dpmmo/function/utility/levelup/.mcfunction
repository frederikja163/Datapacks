# Has player leveled up.
$execute if score @s $(skill)_xp < @s $(skill)_req run return fail

# level up
$scoreboard players operation @s $(skill)_xp -= @s $(skill)_req
$scoreboard players add @s $(skill)_level 1
scoreboard players add @s dpmmo_total_level 1

# normal
scoreboard players set @s dpmmo_lvl_up_type 0
# minor
$scoreboard players operation @s dpmmo_tmp = @s $(skill)_level
scoreboard players operation @s dpmmo_tmp %= 10 dpmmo_globals
execute if score @s dpmmo_tmp matches 0..0 run scoreboard players set @s dpmmo_lvl_up_type 1
#mayor
$scoreboard players operation @s dpmmo_tmp = @s $(skill)_level
scoreboard players operation @s dpmmo_tmp %= 100 dpmmo_globals
execute if score @s dpmmo_tmp matches 0..0 run scoreboard players set @s dpmmo_lvl_up_type 2

execute as @s at @s run function dpmmo:utility/levelup/playsound
$function dpmmo:utility/levelup/announce {skill: "$(skill)"}
$function $(success) {skill: "$(skill)"}
$function dpmmo:utility/calc_percentage {skill: "$(skill)"}

scoreboard players set @s dpmmo_lvl_up_type 0

# Calculate new requirement.
$scoreboard players operation @s $(skill)_req = @s $(skill)_level

$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req *= 2 dpmmo_globals
$execute if score @s $(skill)_level matches 0..15 run scoreboard players operation @s $(skill)_req += 7 dpmmo_globals

$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req *= 5 dpmmo_globals
$execute if score @s $(skill)_level matches 16..30 run scoreboard players operation @s $(skill)_req -= 38 dpmmo_globals

$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req *= 9 dpmmo_globals
$execute if score @s $(skill)_level matches 31.. run scoreboard players operation @s $(skill)_req -= 158 dpmmo_globals