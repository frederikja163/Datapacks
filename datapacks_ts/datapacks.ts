import * as fs from "node:fs"

export type Callback = () => void;

let root = "./datapacks";
export function setRootPath(path: string = "./datapacks"){
    root = path;
}

let datapackName = "";
export function getDatapack() {return datapackName};
export function datapack(name: string, description: string, format: number, callback: Callback){
    if (datapackName != ""){
        throw Error("Cant have datapack inside datapack.");
    }
    datapackName = name;
    if (fs.existsSync(`${root}/${datapackName}`)){
        fs.rmdirSync(`${root}/${datapackName}`, {recursive: true});
    }
    const mcmeta = {
        pack: {
            pack_format: format,
            description: description,
        }
    }
    createDirAndWrite(`${root}/${datapackName}`, "pack.mcmeta", toString(mcmeta))
    callback();
    datapackName = "";
}

let namespaceName = "";
export function getNamespace() {return namespaceName};
export function namespace(name: string, callback: Callback){
    if (namespaceName != ""){
        throw Error("Cant have namespace inside namespace.");
    }
    namespaceName = name;
    callback();
    namespaceName = "";
}


let functionName = "";
export function getFunc() {return functionName};
const commands: string[] = [];
export function func(name: string, callback: Callback){
    if (functionName != ""){
        throw Error("Cant have function inside function.");
    }
    functionName = name;

    callback();

    let content: string = "# This file has been auto generated. Any changes might be overriden.";
    for (let com of commands){
        content += `\n`;
        if (/\$\(.+\)/.test(com)){
            content += "$";
        }
        content += com;
    }
    createDirAndWrite(`${root}/${datapackName}/data/${namespaceName}/function/`, `${functionName}.mcfunction`, content);
    functionName = "";
    commands.splice(0, commands.length);
}

export function command(...args: any[]){
    let com = argsToString(args);
    
    let mods = "";
    for (let mod of modifiers){
        mods += mod + " ";
    }

    commands.push((mods + com));
}

let modifiers: string[] = [];
export function modify(string: string, callback: Callback){
    modifiers.push(string);
    callback();
    modifiers.pop();
}

function argsToString(args: any[]){
    let str = "";
    for (let a of args){
        str += toString(a);
        str += " ";
    }
    return str.trim();
}

export type TagObject = Partial<{
    replace: boolean,
    values: (string | {id: string, required: boolean})[]
}>
export function tag(folder: string, name: string, object: TagObject){
    createDirAndWrite(`${root}/${datapackName}/data/${namespaceName}/tags/${folder}`, `${name}.json`, toString(object));
}

function createDirAndWrite(path: string, file: string, content: string){
    fs.mkdirSync(path, {recursive: true});
    fs.writeFile(`${path}/${file}`, content, () => {});
}

export function toString(obj: any): string{
    const str = JSON.stringify(obj);
    if (str.charAt(0) == '"' && str.charAt(str.length - 1)){
        return str.substring(1, str.length - 1);
    }
    return str;
}