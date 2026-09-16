$execute if score @s $(skill)_charges matches ..0 run return fail

$execute anchored eyes run function dps:utility/ray_cast/ {success: "function dps:powerup/tree_cutter/hit {skill: '$(skill)'}", block: "#dps:logs"}
