execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=45..135] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=east]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=-135..-45] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=west]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=135..-135] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=south]
execute unless block ~ ~ ~ minecraft:lectern as @s[y_rotation=-45..45] run setblock ~ ~ ~ minecraft:lectern[has_book=true, facing=north]

data modify storage aom:globals x set from block ~ ~ ~ x
data modify storage aom:globals y set from block ~ ~ ~ y
data modify storage aom:globals z set from block ~ ~ ~ z