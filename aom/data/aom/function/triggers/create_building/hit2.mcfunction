# Set again here to remove '"' around the name from the sign.
$data modify storage aom:tmp create_building.building_name set value $(building_name)
$data modify storage aom:tmp create_building.village_name set from storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name
function aom:new_building with storage aom:tmp create_building