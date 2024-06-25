scoreboard objectives add aom.globals dummy

scoreboard objectives add aom.players.ray dummy

scoreboard objectives add aom.villages.player_count dummy
scoreboard objectives add aom.villages.village_count dummy
scoreboard objectives add aom.villages.house_count dummy

scoreboard objectives add aom.help trigger
scoreboard objectives add aom.start_village trigger
scoreboard objectives add aom.create_building trigger

tellraw @a "AoM loaded successfully!"