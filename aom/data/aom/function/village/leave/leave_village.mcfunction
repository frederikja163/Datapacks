$${ld_a aom:$(village_index) player_count}
${decr_a 1}
$${st_a aom:$(village_index) player_count}
$function aom:village/update_book with storage aom:$(village_index) $(building_index)

$data remove storage aom:$(uuid0)$(uuid2)$(uuid2)$(uuid3) village_index

$tellraw @a "Left $(village_index)"