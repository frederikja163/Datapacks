$execute unless data storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name run tellraw @a "Cant leave village since you are not part of a village yet"
$execute unless data storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name run return 0

$scoreboard players remove $(village_name) aom.villages.player_count 1
data remove storage aom:data players.$(uuid0)$(uuid1)$(uuid2)$(uuid3).village_name

$function aom:update_book with storage aom:data villages.$(village_name).village
$tellraw @a "Left $(village_name)"