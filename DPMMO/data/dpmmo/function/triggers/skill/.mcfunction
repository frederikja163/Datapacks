$tellraw @s [{text: "=== [",color: yellow},{storage:"dpmmo:skill", nbt:"$(skill).display", color:yellow}, {text:"] ===", color: yellow}]
$tellraw @s [{text: "Level: ", color: gold},{score: {name:"@s", objective:"$(skill)_level"}, color: "aqua"}, {text:" (", color:"white"}, {score: {name:"@s", objective: "$(skill)_percentage"}, color: "yellow"}, {text: "%", color: "yellow"}, {text:")", color:"white"}]
$tellraw @s [{text: "Xp: ", color: gold},{score: {name:"@s", objective:"$(skill)_xp"}, color: "aqua"},{text: "/", color: aqua},{score: {name:"@s", objective:"$(skill)_req"}, color: "aqua"}]
$function $(effect) {skill: "$(skill)", name: "$(name)"}
$tellraw @s [{text: "=== [",color: yellow},{storage:"dpmmo:skill", nbt:"$(skill).display", color:yellow}, {text:"] ===", color: yellow}]
$scoreboard players set @s $(skill) 0