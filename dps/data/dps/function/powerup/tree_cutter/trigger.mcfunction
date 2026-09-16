tellraw @s [{text: "--------------", color: yellow}]

tellraw @s [{text: "Tree cutter", color: "gold"}]
$tellraw @s [{text: "Recharge time: ", color: "gold"}, {score:{name:"$(name)", objective:"$(skill)_cooldown_max"}, color: aqua}]
$tellraw @s [{text: "Charges: ", color: "gold"}, {score:{name:"$(name)", objective:"$(skill)_charges"}, color: aqua}]
$tellraw @s [{text: "Charges max: ", color: "gold"}, {score:{name:"$(name)", objective:"$(skill)_charges_max"}, color: aqua}]

$execute if score @s $(skill)_charges < @s $(skill)_charges_max run tellraw @s [{text: "Status: ", color: gold}, {score:{name:"$(name)",objective:"$(skill)_charges"}, color: "green"}, {text: "/", color: "green"}, {score:{name:"$(name)",objective:"$(skill)_charges_max"}, color: "green"}, {text: "⚡ ", color: "yellow"}, {text: "(", color: "gray"}, {text: "+1 ", color: "green"}, {text: "⏳", color: "red"}, {score:{name:"$(name)",objective:"$(skill)_cooldown"}, color: "red"}, {text: "s", color: "red"}, {text: ")", color: "gray"}]
$execute if score @s $(skill)_charges = @s $(skill)_charges_max run tellraw @s [{text: "Status: ", color: gold}, {score:{name:"$(name)",objective:"$(skill)_charges"}, color: "green"}, {text: "/", color: "green"}, {score:{name:"$(name)",objective:"$(skill)_charges_max"}, color: "green"}, {text: "⚡ ", color: "yellow"}]