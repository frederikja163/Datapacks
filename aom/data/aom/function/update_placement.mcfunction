# kill items on the ground nearby
$execute unless block ~ ~ ~ minecraft:lectern run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=$(direction)]
$function aom:buildings/$(building_name)/placement/update with entity @s data.aom