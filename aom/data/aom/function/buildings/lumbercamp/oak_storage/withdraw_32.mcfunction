data modify storage aom:tmp withdraw set value {id:"minecraft:oak_log",name:"oak log",count:32}
$data modify storage aom:tmp withdraw.items set from storage aom:data villages.$(village_name).$(building_name).oak.items
execute store result score withdraw aom.globals run function aom:withdraw with storage aom:tmp withdraw
data remove storage aom:tmp withdraw

scoreboard players operation items aom.globals -= withdraw aom.globals
$execute store result storage aom:data villages.$(village_name).$(building_name).oak.items int 1 run scoreboard players get items aom.globals
scoreboard players reset withdraw aom.globals
scoreboard players reset items aom.globals