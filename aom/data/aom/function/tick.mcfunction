${func help}
${func start_village}
${func create_building}

execute as @e[type=minecraft:marker,nbt={data:{aom:{id:"placement"}}}] at @s run function aom:update_placement/ with entity @s data.aom