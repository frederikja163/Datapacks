$data modify storage aom:globals village_index set value $(village_index)
$data modify storage aom:globals building_index set value $(building_index)
${st_uuid aom:globals}

function aom:village/join with storage aom:globals