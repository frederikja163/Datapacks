execute store success storage aom:globals result int 1 run data get block ~ ~ ~ front_text
execute if data storage aom:globals {result:0} run tellraw @s $<error.json>
execute if data storage aom:globals {result:0} run return 0

data modify storage aom:globals village_name set from block ~ ~ ~ front_text.messages[0]
${ld_a aom:globals village_count}
${incr_a 1}
${st_a aom:globals village_count}
${cp aom:globals village_count aom:globals village_index}

function aom:village/new with storage aom:globals