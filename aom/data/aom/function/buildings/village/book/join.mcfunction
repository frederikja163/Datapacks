$data modify storage aom:tmp village_name set value $(village_name)
${st_uuid aom:tmp uuid}

function aom:join with storage aom:tmp

${rm aom:tmp village_name}
${rm_uuid aom:tmp uuid}