scoreboard objectives add dps trigger
scoreboard objectives add dps_tmp dummy
scoreboard objectives add dps_globals dummy
scoreboard objectives add dps_xp_config dummy
# 0 = normal, 1 = minor, 2 = mayor
scoreboard objectives add dps_lvl_up_type dummy

scoreboard players set -1 dps_globals -1
scoreboard players set 1 dps_globals 1
scoreboard players set 2 dps_globals 2
scoreboard players set 5 dps_globals 5
scoreboard players set 7 dps_globals 7
scoreboard players set 9 dps_globals 9
scoreboard players set 10 dps_globals 10
scoreboard players set 38 dps_globals 38
scoreboard players set 100 dps_globals 100
scoreboard players set 158 dps_globals 158
scoreboard players set 300 dps_globals 300

scoreboard objectives add dps_total_level dummy

function dps:skill/combat/load
function dps:skill/digging/load
function dps:skill/mining/load
function dps:skill/woodcutting/load

function dps:skill/farming/load
function dps:skill/enchanting/load
function dps:skill/fishing/load

function dps:second