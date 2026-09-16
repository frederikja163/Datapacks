function dpmmo:skill/enchanting/actions {function: "dpmmo:utility/give_xp/"}

execute as @a run function dpmmo:utility/levelup/ {"skill": "dpmmo_enchanting", success: "dpmmo:utility/nop"}