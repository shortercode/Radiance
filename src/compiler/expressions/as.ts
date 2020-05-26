import { AST, Compiler } from "../core";
import { TypePattern } from "../../parser/index";
import { WASTExpressionNode, WASTConvertToFloat, WASTConvertToInt, Ref } from "../../WASTNode";
import { parse_type } from "../LangType";
import { type_assert, type_error } from "../error";
import { wrap_boolean_cast } from "./boolean";

function read_node_data (node: AST) {
	return node.data as {
		expr: AST, 
		type: TypePattern
	}
}

export function visit_as_expression (compiler: Compiler, node: AST): WASTExpressionNode {
	const value = read_node_data(node);
	const ref = Ref.from_node(node);

	const target_type = parse_type(value.type, compiler.ctx);
	const new_value = compiler.visit_expression(value.expr, target_type);

	if (target_type.equals(new_value.value_type)) {
		return new_value;
	}

	if (target_type.is_float()) {
		type_assert(new_value.value_type.is_numeric(), node, `Unable to cast non-numeric type ${new_value.value_type.name} to ${target_type.name}`);

		return new WASTConvertToFloat(ref, target_type, new_value);
	}
	else if (target_type.is_integer()) {
		type_assert(new_value.value_type.is_numeric(), node, `Unable to cast non-numeric type ${new_value.value_type.name} to ${target_type.name}`);

		return new WASTConvertToInt(ref, target_type, new_value);
	}
	else if (target_type.is_boolean()) {
		return wrap_boolean_cast(ref, new_value);
	}
	else {
		type_error(node, `Unable to cast to type ${target_type.name}`);
	}
}