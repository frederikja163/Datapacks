execute if block ~ ~ ~ #minecraft:acacia_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_acacia_log"}}
execute if block ~ ~ ~ #minecraft:birch_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_birch_log"}}
execute if block ~ ~ ~ #minecraft:cherry_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_cherry_log"}}
execute if block ~ ~ ~ #minecraft:dark_oak_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_dark_oak_log"}}
execute if block ~ ~ ~ #minecraft:jungle_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_jungle_log"}}
execute if block ~ ~ ~ #minecraft:mangrove_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_mangrove_log"}}
execute if block ~ ~ ~ #minecraft:oak_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_oak_log"}}
execute if block ~ ~ ~ #minecraft:pale_oak_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_pale_oak_log"}}
execute if block ~ ~ ~ #minecraft:spruce_logs run summon item ~ ~ ~ {Item: {count:1, id:"minecraft:stripped_spruce_log"}}

setblock ~ ~ ~ air
function dpmmo:utility/remove_durability
scoreboard players add @s dpmmo_oak_log 1

$execute positioned ~1 ~1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~ ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~ ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~ ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~-1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~-1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~1 ~-1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}

$execute positioned ~ ~1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~ ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
# $execute positioned ~ ~ ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~ ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~-1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~-1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~ ~-1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}

$execute positioned ~-1 ~1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~ ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~ ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~ ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~-1 ~1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~-1 ~ if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
$execute positioned ~-1 ~-1 ~-1 if block ~ ~ ~ #dpmmo:logs run function dpmmo:powerup/tree_cutter/recursive {skill: "$(skill)"}
