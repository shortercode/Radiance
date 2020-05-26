import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTNodeList, Ref } from "../../WASTNode";
import { VOID_TYPE } from "../LangType";

export function visit_block_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const ctx = compiler.ctx;
	const ref = Ref.from_node(node);
	const node_list = new WASTNodeList(ref);
	const statements = node.data as Array<AST>;
	
	ctx.environment!.push_frame();
	
	const last = statements.slice(-1)[0];
	const rest = statements.slice(0, -1);
	
	for (const stmt of rest) {
		const result = compiler.visit_local_statement(stmt, null);
		node_list.nodes.push(result);
	}

	if (last) {
		const result = compiler.visit_local_statement(last, type_hint);
		node_list.nodes.push(result);
		node_list.value_type = result.value_type;
	}
	else {
		node_list.value_type = VOID_TYPE;
	}
	
	ctx.environment!.pop_frame();
	
	return node_list;
}