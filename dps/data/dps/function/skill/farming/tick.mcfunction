function dps:skill/farming/actions {function: "dps:utility/give_xp/"}

execute as @a run function dps:utility/levelup/ {"skill": "dps_farming", success: "dps:utility/nop"}