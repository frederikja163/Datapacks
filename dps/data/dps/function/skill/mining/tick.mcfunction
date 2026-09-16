function dps:skill/mining/actions {function: "dps:utility/give_xp/"}

execute as @a run function dps:utility/levelup/ {"skill": "dps_mining", success: "dps:powerup/effect/levelup"}

execute as @a if predicate dps:wearing_mining_tool run function dps:powerup/effect/wearing_tool {"skill": "dps_mining"}