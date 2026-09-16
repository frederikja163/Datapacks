$scoreboard players remove @s $(skill)_charges 1

$tellraw @s [{storage: "dpmmo:skill", nbt:"$(skill).display", color:gold}, {text: " • ", color: "dark_gray"}, {text:"Tree cutter", color:gold}, " ", {text:" Used!", color: green}]
execute at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 1.2 0.2

$function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}