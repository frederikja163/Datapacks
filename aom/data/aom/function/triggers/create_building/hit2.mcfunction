# Cleaned up in hit1

$data modify storage aom:tmp building_name set value $(building_name)
$data modify storage aom:tmp village_name set from storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name
function aom:new_building with storage aom:tmp

${rm aom:tmp village_name}