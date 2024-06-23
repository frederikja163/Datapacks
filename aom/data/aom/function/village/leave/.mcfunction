$execute unless data storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) village_index run tellraw @a "Cant leave village since you are not part of a village yet"
$execute unless data storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) village_index run return 0
$data modify storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) building_index set value $(building_index)
$function aom:village/leave/leave_village with storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3)
$data remove storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) building_index