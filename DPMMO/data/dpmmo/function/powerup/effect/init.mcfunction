$function dpmmo:utility/skill_init {skill: "$(skill)", display: "$(display)"}

$scoreboard objectives add $(skill)_cooldown dummy
$scoreboard objectives add $(skill)_time dummy
$scoreboard objectives add $(skill)_time_max dummy
$scoreboard objectives add $(skill)_amplifier dummy
$scoreboard objectives add $(skill)_Amplifier dummy

$data modify storage dpmmo:skill $(skill).effect set value "$(effect)"
$data modify storage dpmmo:skill $(skill).Effect set value "$(Effect)"