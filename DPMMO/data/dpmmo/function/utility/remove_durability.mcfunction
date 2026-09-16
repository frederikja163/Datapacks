summon minecraft:armor_stand ~ ~ ~ {Tags:[dpmmo_durability]}

item replace entity @e[tag=dpmmo_durability,limit=1] weapon.mainhand from entity @s weapon.mainhand
execute as @e[tag=dpmmo_durability,limit=1] store result score @s dpmmo_tmp run data get entity @s equipment.mainhand.components.minecraft:damage
execute as @e[tag=dpmmo_durability,limit=1] store result entity @s equipment.mainhand.components.minecraft:damage int 1 run scoreboard players add @s dpmmo_tmp 1
item replace entity @s weapon.mainhand from entity @e[tag=dpmmo_durability,limit=1] weapon.mainhand

kill @e[tag=dpmmo_durability,limit=1]

