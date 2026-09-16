$function dpmmo:utility/skill_init {skill: "$(skill)", display: "$(display)"}

$scoreboard objectives add $(skill)_cooldown dummy
$scoreboard objectives add $(skill)_cooldown_max dummy
$scoreboard objectives add $(skill)_charges dummy
$scoreboard objectives add $(skill)_charges_max dummy