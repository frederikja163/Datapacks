execute unless data block ~ ~ ~ front_text run tellraw @s $<error.json>
execute unless data block ~ ~ ~ front_text run return 0

data modify storage aom:tmp village_name set from block ~ ~ ~ front_text.messages[0]

function aom:triggers/start_village/hit2 with storage aom:tmp

${rm aom:tmp village_name}