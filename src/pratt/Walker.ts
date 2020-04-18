import Node from "./Node";

class Walker {
    private expressions: Map<string, Function> = new Map
    private statements: Map<string, Function> = new Map

    walk (stmt: Node, ctx: any) {
        this.walkStatement(stmt, ctx);
    }

    defineStatement(k: string, v: Function) {
        this.statements.set(k, v.bind(this));
    }
    defineExpression(k: string, v: Function) {
        this.expressions.set(k, v.bind(this));
    }

    walkStatement (stmt: Node, ctx: any) {
        const fn = this.statements.get(stmt.type);
        if (!fn) throw new Error(`No handler for statement type ${stmt.type}`);
        return fn(stmt.data, ctx);
    }
    
    walkExpression (expr: Node, ctx: any) {
        const fn = this.expressions.get(expr.type);
        if (!fn) throw new Error(`No handler for expression type ${expr.type}`);
        return fn(expr.data, ctx);
    }
}

export default Walker;