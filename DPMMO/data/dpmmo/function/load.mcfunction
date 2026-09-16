scoreboard objectives add dpmmo trigger
scoreboard objectives add dpmmo_tmp dummy
scoreboard objectives add dpmmo_globals dummy
scoreboard objectives add dpmmo_xp_config dummy
# 0 = normal, 1 = minor, 2 = mayor
scoreboard objectives add dpmmo_lvl_up_type dummy

scoreboard players set -1 dpmmo_globals -1
scoreboard players set 1 dpmmo_globals 1
scoreboard players set 2 dpmmo_globals 2
scoreboard players set 5 dpmmo_globals 5
scoreboard players set 7 dpmmo_globals 7
scoreboard players set 9 dpmmo_globals 9
scoreboard players set 10 dpmmo_globals 10
scoreboard players set 38 dpmmo_globals 38
scoreboard players set 100 dpmmo_globals 100
scoreboard players set 158 dpmmo_globals 158
scoreboard players set 300 dpmmo_globals 300

scoreboard objectives add dpmmo_total_level dummy

function dpmmo:skill/combat/load
function dpmmo:skill/digging/load
function dpmmo:skill/mining/load
function dpmmo:skill/woodcutting/load

function dpmmo:skill/farming/load
function dpmmo:skill/enchanting/load
function dpmmo:skill/fishing/load

function dpmmo:second