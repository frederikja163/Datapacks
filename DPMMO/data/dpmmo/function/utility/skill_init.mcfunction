$scoreboard objectives add $(skill) trigger
$scoreboard objectives add $(skill)_level dummy
$scoreboard objectives add $(skill)_xp dummy
$scoreboard objectives add $(skill)_req dummy
$scoreboard objectives add $(skill)_percentage dummy

$data modify storage dpmmo:skill $(skill).display set value "$(display)"