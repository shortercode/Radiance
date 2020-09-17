import { AST, Compiler, TypeHint } from "../core";
import { WASTExpressionNode, Ref, WASTGlobalExpression, WASTStatementNode, WASTSetVarNode } from "../../WASTNode";
import { parse_type } from "../LangType";
import { guess_expression_type } from "../inference";
import { InferContext } from "../InferContext";
import { is_defined, type_assert, type_error } from "../error";
import { VariableNode } from "../../parser/ast";

function read_node_data (node: AST) {
	return (node as VariableNode).data;
}

export function visit_variable (compiler: Compiler, node: AST, _type_hint: TypeHint): WASTExpressionNode {
	const { ref, variable, value } = variable_common_process(compiler, node);
	return new WASTSetVarNode(variable, value, ref);
}

export function visit_global_variable  (compiler: Compiler, node: AST): Array<WASTStatementNode> {
	const { ref, variable, value } = variable_common_process(compiler, node);

	// assumes that the global variable statement is added elsewhere
	return [
		new WASTGlobalExpression(ref, new WASTSetVarNode(variable, value, ref)),
	];
}

function variable_common_process (compiler: Compiler, node: AST) {
	const ctx = compiler.ctx;
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	let type;

	if (!data.initial) {
		type_error(node, `Variables MUST include an initialiser at the moment.`);
	}

	if (data.type) {
		type = parse_type(data.type, compiler.ctx);
	}
	// NOTE due to limited control analysis variables must have an initialiser
	// at this time. Until then some of this code is unrequired.
	else if (data.initial) {
		const infer_ctx = new InferContext(compiler.ctx);
		type = guess_expression_type(data.initial, infer_ctx)!;
	}
	else {
		type_error(node, `Unable to infer type of ${data.name} without an initialiser or explicit type.`);
	}

	type_assert(is_defined(type), node, `Unable to infer type of ${data.name} please include an explicit type`);

	const variable = ctx.declare_variable(ref, data.name, type);
	const value = compiler.visit_expression(data.initial, type);

	type_assert(type.equals(value.value_type), node, `Initialiser type ${value.value_type.name} doesn't match variable type ${type.name}`);

	return {
		ref,
		variable,
		value
	};
}