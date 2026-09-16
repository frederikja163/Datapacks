$execute as @a[scores={$(skill)_cooldown=1..}] if score @s $(skill)_charges < @s $(skill)_charges_max run scoreboard players remove @s $(skill)_cooldown 1
$execute as @a if score @s $(skill)_cooldown > @s $(skill)_cooldown_max run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max

$execute as @a[scores={$(skill)_cooldown=0..0}] run scoreboard players add @s $(skill)_charges 1
$execute as @a[scores={$(skill)_cooldown=0..0}] run tellraw @s [{storage: "dpmmo:skill", nbt:"$(skill).display", color:gold}, {text: " • ", color: "dark_gray"}, {storage: "dpmmo:skill", nbt:"$(skill).Effect", color:gold}, {text:"Tree cutter", color:gold}, {text:" +1!", color: green}, {text:"⚡", color:yellow}, {text:" (", color:white}, {score:{name:"@s", objective:"$(skill)_charges"}, color:green}, {text:"/", color:green}, {score:{name:"@s", objective:"$(skill)_charges_max"}, color:green}, {text:"⚡", color:yellow}, {text:")", color:white}]
$execute as @a[scores={$(skill)_cooldown=0..0}] run scoreboard players operation @s $(skill)_cooldown = @s $(skill)_cooldown_max
