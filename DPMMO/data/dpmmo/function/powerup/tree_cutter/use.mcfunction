$execute if score @s $(skill)_charges matches ..0 run return fail

$execute anchored eyes run function dpmmo:utility/ray_cast/ {success: "function dpmmo:powerup/tree_cutter/hit {skill: '$(skill)'}", block: "#dpmmo:logs"}
