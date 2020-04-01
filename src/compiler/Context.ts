import { FunctionDeclaration } from "./FunctionDeclaration.js";
import { Environment } from "./Environment.js";
import { AtiumType } from "./AtiumType.js";
import { Variable } from "./Variable.js";

export class Context {
    private globals: Map<string, FunctionDeclaration> = new Map
    environment: Environment | null = null

    declare_variable (name: string, type: AtiumType): Variable {
        if (this.environment === null)
            throw new Error("Cannot declare global variable");

        return this.environment.declare(name, type);
    }

    declare_function (name: string, type: AtiumType, parameters: Array<{ name: string, type: AtiumType }>) {
        if (this.environment !== null)
            throw new Error("Cannot declare local function");
        
        if (this.globals.has(name))
            throw new Error(`Global ${name} already exists`);

        const fn = new FunctionDeclaration(type, parameters);
        
        this.globals.set(name, fn);
    }

    get_global (name: string) {
        return this.globals.get(name);
    }

    get_local (name: string) {
        return this.environment.get_variable(name);
    }
}