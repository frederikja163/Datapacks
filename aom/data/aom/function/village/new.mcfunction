$tellraw @a ["A new village has appeared by the name of '", $(village_name), "'"]
$data modify storage aom:$(village_index) village_name set value $(village_name)
$data modify storage aom:$(village_index) village_index set value $(village_index)
$data modify storage aom:$(village_index) building_count set value 0
$data modify storage aom:$(village_index) player_count set value 0

$data modify storage aom:$(village_index) building_type set value '"Town Hall"'
$data modify storage aom:$(village_index) book_function set value "aom:village/book/"
$function aom:village/new_building with storage aom:$(village_index)