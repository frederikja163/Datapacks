import { command, datapack, func, namespace, setRootPath, tag } from "./datapacks_ts/datapacks.ts";
import * as fs from "node:fs"

setRootPath("/home/frederikja/.minecraft/saves/DatapackTests/datapacks/");

datapack("improved_spectator", "An improvement to the normal spectator, by moving the player back when they go back to survival", 48, () => {
    namespace("imsp", () => {
        func("tick", () => {
            command("execute as @a run function imsp:save_gamemode with entity @s");
        });
        
        func("save_gamemode", () => {
            command("data modify storage imsp:uuid 0 set from entity @s UUID[0]")
            command("data modify storage imsp:uuid 1 set from entity @s UUID[1]")
            command("data modify storage imsp:uuid 2 set from entity @s UUID[2]")
            command("data modify storage imsp:uuid 3 set from entity @s UUID[3]")
            command("function imsp:save_gamemode_uuid with storage imsp:uuid");
        })

        func("save_gamemode_uuid", () => {
            
            command("$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 0");
            command("$execute as @s[gamemode=creative] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 1");
            command("$execute as @s[gamemode=adventure] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 2");
            command("$execute as @s[gamemode=spectator] run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode set value 3");
            
            command("$execute store success score different result run data modify storage imsp:$(0)$(1)$(2)$(3) gamemode_prev set from storage imsp:$(0)$(1)$(2)$(3) gamemode");
            // command("execute if score different result matches 1 as @s[gamemode=survival] run function imsp:tp with storage imsp:pos $(0)$(1)$(2)$(3)");
            // command("data ")
            command("$execute if score different result matches 1 as @s[gamemode=survival] run function imsp:tp with storage imsp:$(0)$(1)$(2)$(3)");
            command("$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) x set from entity @s Pos[0]");
            command("$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) y set from entity @s Pos[1]");
            command("$execute as @s[gamemode=survival] run data modify storage imsp:$(0)$(1)$(2)$(3) z set from entity @s Pos[2]");
        });

        func("tp", () => {
            command("$tp @s $(x) $(y) $(z)");
        });
    });
    namespace("minecraft", () => {
        tag("function", "tick", {values: ["imsp:tick"]});
    });
});