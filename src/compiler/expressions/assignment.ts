import { Compiler, AST, TypeHint } from "../core";
import { WASTExpressionNode, WASTTeeLocalNode, Ref } from "../../WASTNode";
import { syntax_assert, is_defined, type_assert } from "../error";

function read_node_data (node: AST) {
	return node.data as {
		left: AST,
		right: AST
	};
}
export function visit_assignment_expression (compiler: Compiler, node: AST, type_hint: TypeHint): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);

	syntax_assert(value.left.type === "identifier", node, `Invalid left hand side of assignment`);
	
	const variable_name = value.left.data as string;
	const variable = compiler.ctx.get_variable(variable_name)!;
	
	syntax_assert(is_defined(variable), node, `Unable to assign to undeclared variable ${variable_name}`);
	
	// TODO in the future we may support type inference, in this case we would not pass the variable type in here
	const new_value = compiler.visit_expression(value.right, variable.type);
	
	// TODO improve error message
	type_assert(variable.type.equals(new_value.value_type), node, `Assignment value doesn't match variable type`);
	
	return new WASTTeeLocalNode(ref, variable.id, variable.name, new_value, variable.type);
}