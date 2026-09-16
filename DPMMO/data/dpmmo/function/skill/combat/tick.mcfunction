function dpmmo:skill/combat/actions {function: "dpmmo:utility/give_xp/"}

execute as @a run function dpmmo:utility/levelup/ {"skill": "dpmmo_combat", success: "dpmmo:powerup/effect/levelup"}

execute as @a if predicate dpmmo:wearing_combat_tool run function dpmmo:powerup/effect/wearing_tool {"skill": "dpmmo_combat"}