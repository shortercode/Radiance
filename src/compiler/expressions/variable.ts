import { TypePattern } from "../../parser/index";
import { AST, Compiler, TypeHint } from "../core";
import { WASTExpressionNode, WASTSetLocalNode, Ref, WASTSetGlobalNode, WASTGlobalExpression, WASTStatementNode } from "../../WASTNode";
import { parse_type } from "../LangType";
import { guess_expression_type } from "../inference";
import { InferContext } from "../InferContext";
import { is_defined, type_assert } from "../error";

function read_node_data (node: AST) {
	return node.data as {
		name: string
		type: TypePattern | null
		initial: AST
	}
}

export function visit_variable (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const { ref, id, name, value } = variable_common_process(compiler, node);
	return new WASTSetLocalNode(ref, id, name, value);
}

export function visit_global_variable  (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const { ref, id, name, value } = variable_common_process(compiler, node);

	// assumes that the global variable statement is added elsewhere
	return [
		new WASTGlobalExpression(ref, new WASTSetGlobalNode(ref, id, name, value)),
	];
}

function variable_common_process (compiler: Compiler, node: AST) {
	const ctx = compiler.ctx;
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	let type;

	if (data.type) {
		type = parse_type(data.type, compiler.ctx);
	}
	else {
		const infer_ctx = new InferContext(compiler.ctx);
		type = guess_expression_type(data.initial, infer_ctx)!;
	}

	type_assert(is_defined(type), node, `Unable to infer type of ${data.name} please include an explicit type`);

	const { id, name } = ctx.declare_variable(ref, data.name, type);
	const value = compiler.visit_expression(data.initial, type);

	type_assert(type.equals(value.value_type), node, `Initialiser type ${value.value_type.name} doesn't match variable type ${type.name}`);

	return {
		ref,
		id,
		name,
		value
	};
}