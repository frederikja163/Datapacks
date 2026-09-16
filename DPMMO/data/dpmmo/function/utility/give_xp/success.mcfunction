$scoreboard players operation @s $(name) *= $(name) dpmmo_xp_config
$scoreboard players operation @s $(skill)_xp += @s $(name)
$scoreboard players set @s $(name) 0

$function dpmmo:utility/calc_percentage {skill: $(skill)}
