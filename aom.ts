import { command, datapack, func, getFunc, getNamespace, modify, namespace, setRootPath, tag, toString } from "./datapacks_ts/datapacks.ts";
import { text, underlined, bold, hoverEvent, clickEvent, italic } from "./datapacks_ts/text.ts";

const scoreboards: {name: string, criteria: string, display: string | undefined}[] = [];
const triggerFunctions: string[] = [];

setRootPath("/home/frederikja/.minecraft/saves/DatapackTests/datapacks/");

scoreboard("aom.ray", "dummy");
scoreboard("aom.globals", "dummy");

datapack("aom", "Official age of minecraft datapack", 48, () => {
    namespace("minecraft", () => {
        tag("function", "tick", {values: ["aom:tick"]});
        tag("function", "load", {values: ["aom:load"]});
    });
    namespace("aom", () => {
        func("ray", () => {
            command("scoreboard players add @s aom.ray 1");
            modify("execute unless block ~ ~ ~ air", () => {
                command("positioned ~ ~ ~ run function $(on_hit)");
                command("run scoreboard players set @s aom.ray 0");
                command("run return 1");
            })
            command(`execute positioned ^ ^ ^.1 unless score @s aom.ray matches 50.. run return run function aom:ray {'on_hit':'$(on_hit)'}`);
            command("scoreboard players set @s aom.ray 0");
            command("return 0");
        });
        
        triggerFunc("help", () =>{
            command("tellraw @s", [
                text("Welcome to Age of Minecraft.\n", underlined(), bold()),
                text("In order to get started place a sign, with the name of your town on the first line.\n"),
                text("Then write "),
                text("/trigger aom.start_village", underlined(), hoverEvent("/trigger aom.start_village"), clickEvent("/trigger aom.start_village", "suggest_command")),
                text(", while looking at the sign, in order to start a new village.")
            ]);
        });

        triggerFunc("start_town", () => {
            command("execute anchored eyes run function aom:ray", {on_hit:"aom:start_town_hit"});
        });

        func("start_town_hit", () => {
            modify("execute if data block ~ ~ ~ front_text run", () => {
                command("data modify storage aom:globals town_name set from block ~ ~ ~ front_text.messages[0]");
                incr("globals", "town_count");
                st_uuid();
                command("data modify storage aom:globals town_index set from storage aom:globals town_count");
                
                command(`function aom:init_town with storage aom:globals`);
                command(`function aom:set_town_lectern with storage aom:globals`);
            });
        });
        
        func("init_town", () => {
            command("data modify storage aom:$(town_index) name set value $(town_name)");
            command("data modify storage aom:$(uuid0)$(uuid1)$(uuid2)$(uuid3) town set value $(town_index)");
        });
        
        func("set_town_lectern", () => {
            command(`setblock ~ ~ ~ minecraft:lectern[has_book=true]{}`);
            command(`function aom:update_town_lectern with storage aom:globals`);
        });
        
        func("update_town_lectern", () => {
            test();
            update_lectern('Town book', 
                `[${JSON.stringify(text("test"))},'(town_name)']`,
                "['Test','aa']");
            // update_lectern('Town book', 
            //     `[[${JSON.stringify({text: 'abc'}).replaceAll('"', "'")},'aa']]`, "[['Test','aa']]");
        });

        func("load", () => {
            for (const s of scoreboards){
                command(`scoreboard objectives add ${s.name} ${s.criteria} ${s.display ? s.display : ""}`);
            }
            // TODO: This is only here for testing:
            command("data modify storage aom:globals town_count set value 0");
        });
        func("unload", () => {
            for (const s of scoreboards){
                command(`scoreboard objectives remove ${s.name}`);
            }
        });
        func("tick", () => {
            for (let f of triggerFunctions){
                command(`scoreboard players enable @a aom.${f}`);
                const selector = `@a[scores={${getNamespace()}.${f}=1}]`;
                command(`execute at ${selector} as ${selector} run function ${getNamespace()}:${f}`);
                command(`scoreboard players set @a ${getNamespace()}.${f} 0`);
            }
        });
    });
});

function scoreboard(name: string, criteria: string, display: string | undefined = undefined){
    scoreboards.push({name: name, criteria: criteria, display: display});
}

function triggerFunc(name: string, callback: () => void){
    scoreboard(`aom.${name}`, "trigger");
    triggerFunctions.push(name);
    func(name, callback);
}

function lda(name: string, path: string){
    command(`execute store result score a ${getNamespace()}.globals run data get storage aom:${name} ${path} 1`);
}

function sta(name: string, path: string){
    command(`execute store result storage ${getNamespace()}:${name} ${path} int 1 run scoreboard players get a ${getNamespace()}.globals`)
}

function ldb(name: string, path: string){
    command(`execute store result score a ${getNamespace()}.globals run data get storage aom:${name} ${path} 1`);
}

function op(operator: string){
    command(`scoreboard players operation a ${getNamespace()}.globals ${operator} b aom.globals`);
}

function add(value: number = 1){
    command(`scoreboard players add a ${getNamespace()}.globals ${value}`);
}

function remove(value: number = 1){
    command(`scoreboard players add a ${getNamespace()}.globals ${value}`);
}

function incr(name: string, path: string, value: number = 1){
    lda(name, path);
    add(value);
    sta(name, path);
}

function st_uuid(){
    command("data modify storage aom:globals uuid0 set from entity @s UUID[0]");
    command("data modify storage aom:globals uuid1 set from entity @s UUID[1]");
    command("data modify storage aom:globals uuid2 set from entity @s UUID[2]");
    command("data modify storage aom:globals uuid3 set from entity @s UUID[3]");
}

function test(number = 0){
    command("say " + number);
}

function update_lectern(title: string, ...pages: string[]){
    // const book = {
    //     Book: {
    //         components:
    //         {
    //             "minecraft:written_book_content":
    //             {
    //                 pages:pages,
    //                 author:"Age of Minecraft",
    //                 title:title
    //             }
    //         },
    //     count:1,
    //     id:"minecraft:written_book"}
    // }
    let pageStr = "[";
    for (let page of pages){
        console.log(page);
        pageStr += `'${page.replaceAll('"', '"')}'`;
    }
    pageStr += "]"
    const book = `{Book:{count:1,id:"minecraft:written_book",components:"minecraft:written_book_content":{pages:${pageStr},author:"Age of Minecraft",title:'${title}'}}}`;
    command(`data merge block ~ ~ ~ ${book}`);
}