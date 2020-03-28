import { WASTType } from "../WASTNode.js";

export type AtiumType = WASTType;

export function downgrade_type (type: AtiumType): WASTType {
    switch (type) {
        case "f32":
        case "f64":
        case "i32":
        case "i64":
            return type;
        // everything else is a pointer, we ditch the type
        // information associated with it, as thats just for
        // this stage of the compiler, and just turn it into
        // a number
        default:
            // NOTE we use i32 for the pointer type because this
            // allows us to send it to JS land unlike i64
            return "i32";
    }
}

export function validate_atium_type(type: string): AtiumType {
    // TODO this will need changing when we add objects
    switch (type) {
        case "f32":
        case "f64":
        case "i32":
        case "i64":
            return type;
        default:
            throw new Error(`Illegal type ${type}`);
    }
}

export function compare_atium_types(a: AtiumType, b: AtiumType): boolean {
    // TODO this will need changing when we add objects
    return a === b;
}