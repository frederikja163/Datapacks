# This function might impact performance a lot since it is run every tick.
# Maybe clear books from player inventory too.
execute unless block ~ ~ ~ minecraft:lectern run kill @e[type=minecraft:item,nbt={Item:{components:{"minecraft:written_book_content":{author:"Age of Minecraft"}}}},distance=0..2]
execute unless block ~ ~ ~ minecraft:lectern run kill @e[type=minecraft:item,nbt={Item:{id:"minecraft:lectern"}},distance=0..2]

$function aom:update_placement/place_lectern with storage aom:data villages.$(village_name).$(building_name).$(placement)
$function aom:buildings/$(building_name)/placement/update with storage aom:data villages.$(village_name).$(building_name).$(placement)