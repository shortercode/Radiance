import { AtiumType } from "./AtiumType";
import { Variable } from "./Variable";

export class Environment {
    parent: Environment | null = null
    variables: Map<string, Variable> = new Map

    declare (name: string, type: AtiumType) {
        if (this.variables.has(name))
            throw new Error(`Variable ${name} already exists in the current scope`);
        const variable = new Variable(type);
        this.variables.set(name, variable);
    }

    get_variable (name: string): Variable | null {
        if (this.variables.has(name))
            return this.variables.get(name);
        else if (this.parent !== null)
            return this.parent.get_variable(name);
        else
            return null; 
    }
}