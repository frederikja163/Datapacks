$scoreboard players set items aom.globals $(items)

$execute if score items aom.globals matches $(count).. run give @s $(id) $(count)
$execute if score items aom.globals matches $(count).. run tellraw @s {"text": "Withdrew $(count) oak log","color":"green"}
$execute if score items aom.globals matches $(count).. run return $(count)

$give @s $(id) $(items)
$tellraw @s {"text": "Withdrew $(items) $(name)","color":"green"}
$return $(items)