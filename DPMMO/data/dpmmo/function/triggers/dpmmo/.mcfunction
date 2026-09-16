tellraw @s [{text: "=== [Data Pack MMO] ===", color: yellow}]
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_combat", name:"$(name)"}
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_digging", name:"$(name)"}
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_mining", name:"$(name)"}
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_woodcutting", name:"$(name)"}
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_enchanting", name:"$(name)"}
$function dpmmo:triggers/dpmmo/skill {skill: "dpmmo_farming", name:"$(name)"}
tellraw @s [{text: "--------------", color: yellow}]
$tellraw @s [{text: "📊 Total", color: gold}, {text: " Lv", color: aqua}, {score:{name:"$(name)", objective:"dpmmo_total_level"}, color: aqua}]
tellraw @s [{text: "=== [Data Pack MMO] ===", color: yellow}]
scoreboard players set @s dpmmo 0