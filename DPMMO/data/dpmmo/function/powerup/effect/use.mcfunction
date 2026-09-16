# Still on cooldown
$execute if score @s $(skill)_cooldown matches 1.. run return fail

# Already using effect.
$execute if score @s $(skill)_cooldown matches ..-1 run return fail

# Calculate amplifier
$execute store result storage dpmmo:powerup effect.amplifier int 1 run scoreboard players get @s $(skill)_amplifier
# Calculate time
$execute store result storage dpmmo:powerup effect.time int 1 run scoreboard players get @s $(skill)_time_max

$data modify storage dpmmo:powerup effect.effect set from storage dpmmo:skill $(skill).effect

function dpmmo:powerup/effect/give_effect with storage dpmmo:powerup effect

$tellraw @s [{storage: "dpmmo:skill", nbt:"$(skill).display", color:gold}, {text: " • ", color: "dark_gray"}, {storage: "dpmmo:skill", nbt:"$(skill).Effect", color:gold}, " ", {score:{name:"@s",objective:"$(skill)_Amplifier"}, color: gold}, {text:" Started!", color: green}, {text: " • ", color: "dark_gray"}, {storage:"dpmmo:powerup", nbt:"effect.time",color:"aqua"},{text:"s", color:aqua}]
execute at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 1.2 0.2

data remove storage dpmmo:powerup effect

# Convert to ticks.
$scoreboard players operation @s $(skill)_time = @s $(skill)_time_max
$scoreboard players set @s $(skill)_cooldown 300