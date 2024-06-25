scoreboard players add @s aom.players.ray 1

$execute unless block ~ ~ ~ air positioned ~ ~ ~ run $(on_hit)
execute unless block ~ ~ ~ air run scoreboard players set @s aom.players.ray 0
execute unless block ~ ~ ~ air run return 1

$execute positioned ^ ^ ^.1 unless score @s aom.players.ray matches 50.. run return run function aom:ray {'on_hit':'$(on_hit)'}
scoreboard players set @s aom.players.ray 0
return 0