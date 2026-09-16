# Still on cooldown
$execute if score @s $(skill)_cooldown matches 1.. run return fail

# Already using effect.
$execute if score @s $(skill)_cooldown matches ..-1 run return fail

# Calculate amplifier
$execute store result storage dps:powerup effect.amplifier int 1 run scoreboard players get @s $(skill)_amplifier
# Calculate time
$execute store result storage dps:powerup effect.time int 1 run scoreboard players get @s $(skill)_time_max

$data modify storage dps:powerup effect.effect set from storage dps:skill $(skill).effect

function dps:powerup/effect/give_effect with storage dps:powerup effect

$tellraw @s [{storage: "dps:skill", nbt:"$(skill).display", interpret: true, color:gold}, {text: " • ", color: "dark_gray"}, {storage: "dps:skill", nbt:"$(skill).Effect", interpret: true, color:gold}, " ", {score:{name:"@s",objective:"$(skill)_Amplifier"}, color: gold}, {text:" Started!", color: green}, {text: " • ", color: "dark_gray"}, {storage:"dps:powerup", nbt:"effect.time",color:"aqua"},{text:"s", color:aqua}]
execute at @s run playsound block.note_block.pling player @s ~ ~ ~ 0.4 1.2 0.2

data remove storage dps:powerup effect

# Convert to ticks.
$scoreboard players operation @s $(skill)_time = @s $(skill)_time_max
$scoreboard players set @s $(skill)_cooldown 300