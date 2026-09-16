function dps:skill/enchanting/actions {function: "dps:utility/give_xp/"}

execute as @a run function dps:utility/levelup/ {"skill": "dps_enchanting", success: "dps:utility/nop"}