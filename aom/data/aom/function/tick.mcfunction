${func help}
${func start_village}
${func create_building}

execute as @a[scores={aom.left=1..}] run function aom:update_player/ with entity @s
execute as @a[scores={aom.left=1..}] run scoreboard players set @s aom.left 0

execute as @e[type=minecraft:marker,nbt={data:{aom:{id:"placement"}}}] at @s run function aom:update_placement/ with entity @s data.aom