function dps:skill/woodcutting/actions {function: "dps:utility/give_xp/"}

execute as @a run function dps:utility/levelup/ {"skill": "dps_woodcutting", success: "dps:powerup/tree_cutter/levelup"}

execute as @a if predicate dps:wearing_woodcutting_tool run function dps:powerup/tree_cutter/wearing_tool {"skill": "dps_woodcutting"}