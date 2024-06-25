execute unless data block ~ ~ ~ front_text run tellraw @s $<error.json>
execute unless data block ~ ~ ~ front_text run return 0

data modify storage aom:tmp create_building.building_name set from block ~ ~ ~ front_text.messages[0]
${st_uuid aom:tmp create_building.uuid}
function aom:triggers/create_building/hit2 with storage aom:tmp create_building
