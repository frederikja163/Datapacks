${st_uuid aom:tmp deposit.uuid}
execute store result storage aom:tmp deposit.rueslt int 1 run function aom:player_in_village with storage aom:tmp deposit
execute if data storage aom:tmp {deposit:{result:0}} run tellraw @a {"text":"Must be part of village to deposit items.","color":"red"}
execute if data storage aom:tmp {deposit:{result:0}} run return run data remove storage aom:tmp deposit

$execute store result score items aom.globals run data get storage aom:data villages.$(village_name).$(storage).items
$execute store result score max_items aom.globals run data get storage aom:data villages.$(village_name).$(storage).max_items

execute if score items aom.globals >= max_items aom.globals run data modify storage aom:tmp deposit.result set value 0
$execute if data storage aom:tmp {deposit:{result:0}} run tellraw @s {"text": "No space left for $(name).", "color":"red"}
execute if data storage aom:tmp {deposit:{result:0}} run scoreboard players reset items aom.globals
execute if data storage aom:tmp {deposit:{result:0}} run scoreboard players reset max_items aom.globals
execute if data storage aom:tmp {deposit:{result:0}} run return run data remove storage aom:tmp deposit

scoreboard players operation max_items aom.globals -= items aom.globals
execute store result storage aom:tmp deposit.max_items int 1 run scoreboard players get max_items aom.globals
execute store result score deposit aom.globals run function aom:deposit/clear with storage aom:tmp deposit

$execute if score deposit aom.globals matches 0..0 run tellraw @s {"text": "No $(name) found in inventory to deposit. ","color":"red"}
$execute unless score deposit aom.globals matches 0..0 run tellraw @s [{"text": "Deposited ","color":"green"}, {"score":{"objective":"aom.globals","name":"deposit"}}, " $(name)"]
scoreboard players operation items aom.globals += deposit aom.globals
$execute store result storage aom:data villages.$(village_name).$(storage).items int 1 run scoreboard players get items aom.globals
scoreboard players reset deposit aom.globals
scoreboard players reset items aom.globals
scoreboard players reset max_items aom.globals
${rm aom:tmp deposit}