function dpmmo:skill/combat/tick
function dpmmo:skill/digging/tick
function dpmmo:skill/mining/tick
function dpmmo:skill/woodcutting/tick
function dpmmo:skill/farming/tick
function dpmmo:skill/enchanting/tick
function dpmmo:skill/fishing/tick

execute as @a[scores={dpmmo=1..}] run function dpmmo:triggers/dpmmo/ {name: "@s"}
scoreboard players enable @a dpmmo

execute as @a[scores={dpmmo_combat=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_combat", effect: "dpmmo:powerup/effect/trigger"}
scoreboard players enable @a dpmmo_combat
execute as @a[scores={dpmmo_digging=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_digging", effect: "dpmmo:powerup/effect/trigger"}
scoreboard players enable @a dpmmo_digging
execute as @a[scores={dpmmo_mining=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_mining", effect: "dpmmo:powerup/effect/trigger"}
scoreboard players enable @a dpmmo_mining
execute as @a[scores={dpmmo_woodcutting=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_woodcutting", effect: "dpmmo:powerup/tree_cutter/trigger"}
scoreboard players enable @a dpmmo_woodcutting

execute as @a[scores={dpmmo_farming=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_farming", effect: "dpmmo:utility/nop"}
scoreboard players enable @a dpmmo_farming
execute as @a[scores={dpmmo_enchanting=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_enchanting", effect: "dpmmo:utility/nop"}
scoreboard players enable @a dpmmo_enchanting
execute as @a[scores={dpmmo_fishing=1..}] run function dpmmo:triggers/skill/ {name: "@s", skill: "dpmmo_fishing", effect: "dpmmo:utility/nop"}
scoreboard players enable @a dpmmo_fishing