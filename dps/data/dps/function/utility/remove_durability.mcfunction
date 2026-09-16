summon minecraft:armor_stand ~ ~ ~ {Tags:[dps_durability]}

item replace entity @e[tag=dps_durability,limit=1] weapon.mainhand from entity @s weapon.mainhand
execute as @e[tag=dps_durability,limit=1] store result score @s dps_tmp run data get entity @s equipment.mainhand.components.minecraft:damage
execute as @e[tag=dps_durability,limit=1] store result entity @s equipment.mainhand.components.minecraft:damage int 1 run scoreboard players add @s dps_tmp 1
item replace entity @s weapon.mainhand from entity @e[tag=dps_durability,limit=1] weapon.mainhand

kill @e[tag=dps_durability,limit=1]

