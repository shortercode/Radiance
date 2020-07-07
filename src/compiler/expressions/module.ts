import { WASTStatementNode, Ref } from "../../WASTNode";
import { AST, Compiler } from "../core";
import { hoist_struct_declaration } from "./struct";
import { hoist_function_declaration, visit_function_instance, hoist_imported_function_declaration } from "./function";
import { hoist_enum_declaration } from "./enum";
import { hoist_type } from "./type";

function read_node_data (node: AST) {
	return node.data as Array<AST>;
}

export function visit_module(compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const statements = read_node_data(node);

	for (const stmt of statements) {
		switch (stmt.type) {
			case "struct":
			hoist_struct_declaration(compiler, stmt);
			break;
			case "enum":
			hoist_enum_declaration(compiler, stmt);
			break;
			case "type":
			hoist_type(compiler, stmt);
			break;
		}
	}

	for (const stmt of statements) {
		switch (stmt.type) {
			case "import_function":
			hoist_imported_function_declaration(compiler, stmt);
			break;
			case "export_function":
			case "function":
			hoist_function_declaration(compiler, stmt);
			break;
		}
	}

	const results: Array<WASTStatementNode> = [];

	// TODO the below should be further split into 2 stages, one for global exprs
	// and another for functions ( so that functions can refer to global variables
	// declared on lines after them ).
	
	for (const stmt of statements) {
		const wast_stmts = compiler.visit_global_statement(stmt);
		results.push(...wast_stmts);
	}

	for (const fn_decl of compiler.ctx.function_templates) {
		for (const inst of fn_decl.instances) {
			const stmt = visit_function_instance(compiler, Ref.unknown(), inst);
			results.push(stmt);
		}
	}

	return results;
}