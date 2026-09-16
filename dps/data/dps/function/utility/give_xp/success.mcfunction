$scoreboard players operation @s $(name) *= $(name) dps_xp_config
$scoreboard players operation @s $(skill)_xp += @s $(name)
$scoreboard players set @s $(name) 0

$function dps:utility/calc_percentage {skill: $(skill)}
