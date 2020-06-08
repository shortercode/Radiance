import { AST, Compiler } from "../core";
import { TypePattern } from "../../parser/index";
import { WASTExpressionNode, WASTConvertToFloat, WASTConvertToInt, Ref, WASTLoadNode, WASTNodeList, WASTUnsafeCast } from "../../WASTNode";
import { parse_type, TupleLangType, LangType } from "../LangType";
import { type_assert, type_error } from "../error";
import { wrap_boolean_cast } from "./boolean";
import { create_object } from "./object";

function read_node_data (node: AST) {
	return node.data as {
		expr: AST, 
		type: TypePattern
	}
}

export function visit_as_expression (compiler: Compiler, node: AST): WASTExpressionNode {
	const data = read_node_data(node);
	const ref = Ref.from_node(node);

	const target_type = parse_type(data.type, compiler.ctx);
	const value = compiler.visit_expression(data.expr, target_type);

	return cast_expression(compiler, ref, value, target_type);
}

function cast_expression (compiler: Compiler, ref: Ref, value: WASTExpressionNode, output_type: LangType): WASTExpressionNode {
	const input_type = value.value_type;
	if (output_type.equals(input_type)) {
		return value;
	}
	if (output_type.is_tuple() && input_type.is_tuple()) {
		return visit_as_tuple_expression (compiler, ref, value, input_type, output_type);
	}
	if (output_type.is_float()) {
		type_assert(input_type.is_numeric(), ref, `Unable to cast non-numeric type ${input_type.name} to ${output_type.name}`);

		return new WASTConvertToFloat(ref, output_type, value);
	}
	if (output_type.is_integer()) {
		type_assert(input_type.is_numeric(), ref, `Unable to cast non-numeric type ${input_type.name} to ${output_type.name}`);

		return new WASTConvertToInt(ref, output_type, value);
	}
	if (output_type.is_boolean()) {
		return wrap_boolean_cast(ref, value);
	}
	if (compiler.ctx.is_unsafe && input_type.is_integer()) {
		if (output_type.is_object_type() || output_type.is_string()) {
			return new WASTUnsafeCast(ref, output_type, value);
		}
	}
	if (compiler.ctx.is_unsafe && output_type.is_integer()) {
		if (input_type.is_object_type() || input_type.is_string()) {
			return new WASTUnsafeCast(ref, output_type, value);
		}
	}

	type_error(ref, `Unable to cast ${value.value_type.name} to type ${output_type.name}`);
}

function visit_as_tuple_expression (compiler: Compiler, ref: Ref, expr: WASTExpressionNode, input_type: TupleLangType, output_type: TupleLangType): WASTExpressionNode {
	type_assert(input_type.types.length >= output_type.types.length, ref, `Cannot cast to a tuple with more elements than the input type`);

	// TODO remove this
	if (input_type.types.length === 0) {
		return new WASTNodeList(ref); // this is equivilent to returning a void value, without actually returning one ( as void is the abscense of a value )
	}

	const values: Array<WASTExpressionNode> = [];

	for (const [index, { type, offset }] of input_type.types.entries()) {
		const read_value = new WASTLoadNode(ref, type, expr, offset);
		const sub_type = output_type.types[index].type;
		const value = cast_expression(compiler, ref, read_value, sub_type);

		values.push(value);
	}

	return create_object(compiler, ref, output_type, values);
}