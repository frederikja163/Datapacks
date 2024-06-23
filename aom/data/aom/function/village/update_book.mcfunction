$data modify storage aom:globals param set from storage aom:$(village_index)
$data modify storage aom:globals param merge from storage aom:$(village_index) $(building_index)

$function $(book_function) with storage aom:globals param

$say $(village_index) $(building_index)