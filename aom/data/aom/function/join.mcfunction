$execute if data storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name run function aom:leave with storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3)

$data modify storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name set value $(village_name)
${st_uuid aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).uuid $}

$scoreboard players add $(village_name) aom.villages.player_count 1

$tellraw @a "Joined $(village_name)"