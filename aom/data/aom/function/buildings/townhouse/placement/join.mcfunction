$data modify storage aom:tmp join.village_name set value $(village_name)
${st_uuid aom:tmp join.uuid}

function aom:join with storage aom:tmp join

${rm aom:tmp join}