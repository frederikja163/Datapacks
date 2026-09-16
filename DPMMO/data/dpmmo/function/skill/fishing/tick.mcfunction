function dpmmo:skill/fishing/actions {function: "dpmmo:utility/give_xp/"}

execute as @a run function dpmmo:utility/levelup/ {"skill": "dpmmo_fishing", success: "dpmmo:utility/nop"}