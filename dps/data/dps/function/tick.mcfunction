function dps:skill/combat/tick
function dps:skill/digging/tick
function dps:skill/mining/tick
function dps:skill/woodcutting/tick
function dps:skill/farming/tick
function dps:skill/enchanting/tick
function dps:skill/fishing/tick

execute as @a[scores={dps=1..}] run function dps:triggers/dps/ {name: "@s"}
scoreboard players enable @a dps

execute as @a[scores={dps_combat=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_combat", effect: "dps:powerup/effect/trigger"}
scoreboard players enable @a dps_combat
execute as @a[scores={dps_digging=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_digging", effect: "dps:powerup/effect/trigger"}
scoreboard players enable @a dps_digging
execute as @a[scores={dps_mining=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_mining", effect: "dps:powerup/effect/trigger"}
scoreboard players enable @a dps_mining
execute as @a[scores={dps_woodcutting=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_woodcutting", effect: "dps:powerup/tree_cutter/trigger"}
scoreboard players enable @a dps_woodcutting

execute as @a[scores={dps_farming=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_farming", effect: "dps:utility/nop"}
scoreboard players enable @a dps_farming
execute as @a[scores={dps_enchanting=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_enchanting", effect: "dps:utility/nop"}
scoreboard players enable @a dps_enchanting
execute as @a[scores={dps_fishing=1..}] run function dps:triggers/skill/ {name: "@s", skill: "dps_fishing", effect: "dps:utility/nop"}
scoreboard players enable @a dps_fishing