
${st_uuid aom:tmp withdraw.uuid}
execute store result storage aom:tmp withdraw.result int 1 run function aom:player_in_village with storage aom:tmp withdraw
execute if data storage aom:tmp {withdraw:{result:0}} run tellraw @a {"text":"Must be part of village to withdraw items.","color":"red"}
execute if data storage aom:tmp {withdraw:{result:0}} run return run data remove storage aom:tmp withdraw

$execute store result score items aom.globals run data get storage aom:data villages.$(village_name).$(storage).items

$execute if score items aom.globals matches 0..0 run tellraw @s {"text": "No $(name) to withdraw.", "color":"red"}
execute if score items aom.globals matches 0..0 run scoreboard players reset items aom.globals
execute if score items aom.globals matches 0..0 run return run data remove storage aom:tmp withdraw

$data modify storage aom:tmp withdraw.items set from storage aom:data villages.$(village_name).$(storage).items
execute store result score withdraw aom.globals run function aom:withdraw/get_amount with storage aom:tmp withdraw

scoreboard players operation items aom.globals -= withdraw aom.globals
$execute store result storage aom:data villages.$(village_name).$(storage).items int 1 run scoreboard players get items aom.globals
scoreboard players reset withdraw aom.globals
scoreboard players reset items aom.globals
${rm aom:tmp withdraw}