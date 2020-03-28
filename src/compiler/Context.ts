import { FunctionDeclaration } from "./FunctionDeclaration.js";
import { Environment } from "./Environment.js";
import { AtiumType, downgrade_type } from "./AtiumType.js";

export class Context {
    private globals: Map<string, FunctionDeclaration> = new Map
    private current_environment: Environment | null = null
    
    push_environment () {
        if (this.current_environment === null)
            throw new Error("Cannot push an Environment when there is no active environment");
        const env = new Environment;
        env.parent = this.current_environment;
        this.current_environment = env;
    }

    pop_environment () {
        this.current_environment = this.current_environment.parent;
    }

    create_environment () {
        if (this.current_environment !== null)
            throw new Error("An active environment already exists");
        
        this.current_environment = new Environment;
    }

    exit_environment () {
        const env = this.current_environment;

        if (env === null)
            throw new Error("No active environment currently exists");
        
        this.current_environment = null;
    }

    declare_variable (name: string, type: AtiumType) {
        if (this.current_environment === null)
            throw new Error("Cannot declare global variable");

        this.current_environment.declare(name, type);
    }

    declare_function (name: string, type: AtiumType, parameters: Array<{ name: string, type: AtiumType }>) {
        if (this.current_environment !== null)
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
        return this.current_environment.get_variable(name);
    }
}