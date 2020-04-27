import { WASTStatementNode } from "../../WASTNode";
import { AST, Compiler } from "../core";
import { hoist_struct_declaration } from "./struct";
import { hoist_function, hoist_function_declaration } from "./function";

function read_node_data (node: AST) {
	return node.data as Array<AST>;
}

export function visit_module(compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const statements = read_node_data(node);

	for (const stmt of statements) {
		if (stmt.type === "struct") {
			hoist_struct_declaration(compiler, stmt);
		}
	}

	for (const stmt of statements) {
		switch (stmt.type) {
			case "import_function":
			case "export_function":
			case "function":
			hoist_function_declaration(compiler, stmt);
			break;
		}
	}

	const results: Array<WASTStatementNode> = [];
	
	for (const stmt of statements) {
		const wast_stmts = compiler.visit_global_statement(stmt);
		results.push(...wast_stmts);
	}

	return results;
}