$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 0
$execute as @s[gamemode=creative] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 1
$execute as @s[gamemode=adventure] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 2
$execute as @s[gamemode=spectator] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 3

$execute store success score different imsp run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode_prev set from storage imsp:$(0)$(1)$(2)$(3) gamemode

$execute if score different imsp matches 1 as @s[gamemode=survival] run function imsp:tp with storage imsp:$(0)$(1)$(2)$(3)
$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) x set from entity @s Pos[0]
$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) y set from entity @s Pos[1]
$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) z set from entity @s Pos[2]