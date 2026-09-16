scoreboard players remove __raycast__ dps_tmp 1
execute if score __raycast__ dps_tmp matches ..0 run return fail

$execute unless block ~ ~ ~ $(block) positioned ^ ^ ^0.1 run function dps:utility/ray_cast/recursive {success:"$(success)",block:"$(block)"}
$execute if block ~ ~ ~ $(block) run $(success)
