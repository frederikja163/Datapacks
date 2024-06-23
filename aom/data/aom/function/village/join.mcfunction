$execute if data storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) village_index run function aom:village/leave/ with storage aom:globals

$data modify storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) village_index set value $(village_index)
${st_uuid aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) $}

$${ld_a aom:$(village_index) player_count}
${incr_a 1}
$${st_a aom:$(village_index) player_count}

$function aom:village/update_book with storage aom:$(village_index) $(building_index)
$tellraw @a "Joined $(village_index)"