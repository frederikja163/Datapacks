tellraw @s [{text: "=== [Data Pack Skills] ===", color: yellow}]
$function dps:triggers/dps/skill {skill: "dps_combat", name:"$(name)"}
$function dps:triggers/dps/skill {skill: "dps_digging", name:"$(name)"}
$function dps:triggers/dps/skill {skill: "dps_mining", name:"$(name)"}
$function dps:triggers/dps/skill {skill: "dps_woodcutting", name:"$(name)"}
$function dps:triggers/dps/skill {skill: "dps_enchanting", name:"$(name)"}
$function dps:triggers/dps/skill {skill: "dps_farming", name:"$(name)"}
tellraw @s [{text: "--------------", color: yellow}]
$tellraw @s [{text: "📊 Total", color: gold}, {text: " Lv", color: aqua}, {score:{name:"$(name)", objective:"dps_total_level"}, color: aqua}]
tellraw @s [{text: "=== [Data Pack Skills] ===", color: yellow}]
scoreboard players set @s dps 0