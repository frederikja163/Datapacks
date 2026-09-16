function dpmmo:skill/farming/actions {function: "dpmmo:utility/give_xp/"}

execute as @a run function dpmmo:utility/levelup/ {"skill": "dpmmo_farming", success: "dpmmo:utility/nop"}