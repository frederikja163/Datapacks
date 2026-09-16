function dps:skill/fishing/actions {function: "dps:utility/give_xp/"}

execute as @a run function dps:utility/levelup/ {"skill": "dps_fishing", success: "dps:utility/nop"}