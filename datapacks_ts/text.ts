export function text(text: string, ...options: object[]){
    return apply_options({
        text: text,
    }, options);
}

export function bold(b: boolean = true){
    return {
        bold: b
    };
}

export function italic(b: boolean = true){
    return {
        italic: b
    };
}

export function underlined(b: boolean = true){
    return {
        underlined: b
    };
}

export function strikethrough(b: boolean = true){
    return {
        strikethrough: b
    };
}

export function obfuscated(b: boolean = true){
    return {
        obfuscated: b
    };
}

export function color(color: string){
    return {
        color: color
    }
}

export function clickEvent(value: string, action: string = "run_command"){
    return {
        clickEvent: {
            action: action,
            value: value,
        },
    };
}

export function hoverEvent(contents: string, action = "show_text"){
    return {
            hoverEvent:{
                action: action,
                contents: contents,
            }
        };
}

function apply_options(object: object, optionsArr: any[]){
    for (let options of optionsArr){
        for (let option in options){
            object[option] = options[option];
        }
    }
    return object;
}