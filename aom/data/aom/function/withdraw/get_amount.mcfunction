$execute if score items aom.globals matches $(count).. run give @s $(id) $(count)
$execute if score items aom.globals matches $(count).. run tellraw @s {"text": "Withdrew $(count) $(name)","color":"green"}
$execute if score items aom.globals matches $(count).. run return $(count)

$give @s $(id) $(items)
$tellraw @s {"text": "Withdrew $(items) $(name)","color":"green"}
$return $(items)