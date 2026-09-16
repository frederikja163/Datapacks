$execute as @a[scores={$(skill)_cooldown=1..1}] run tellraw @s [{storage: "dpmmo:skill", nbt:"$(skill).display", color:gold}, {text: " • ", color: "dark_gray"}, {storage: "dpmmo:skill", nbt:"$(skill).Effect", color:gold}, " ", {score:{name:"@s",objective:"$(skill)_Amplifier"}, color: gold}, {text:" Ready!", color: green}]
$execute as @a[scores={$(skill)_cooldown=1..1}] at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 0.2 0.2
$execute as @a[scores={$(skill)_cooldown=1..}] run scoreboard players remove @s $(skill)_cooldown 1
$execute as @a[scores={$(skill)_time=1..1}] at @s run playsound minecraft:block.note_block.bell player @s ~ ~ ~ 0.4 1.2 0.2
$execute as @a[scores={$(skill)_time=1..1}] run tellraw @s [{storage: "dpmmo:skill", nbt:"$(skill).display", color:gold}, {text: " • ", color: "dark_gray"}, {storage: "dpmmo:skill", nbt:"$(skill).Effect", color:gold}, " ", {score:{name:"@s",objective:"$(skill)_Amplifier"}, color: gold}, {text:" Stopped!", color: red}]
$execute as @a[scores={$(skill)_time=1..}] run scoreboard players remove @s $(skill)_time 1
