import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTExpressionType } from "../../WASTNode";

import { write_add_expression } from "./add";
import { write_sub_expression } from "./sub";
import { write_equals_expression } from "./equals";
import { write_not_equals_expression } from "./not_equals";
import { write_less_than_expression } from "./less_than";
import { write_greater_than_expression } from "./greater_than";
import { write_greater_than_equals_expression } from "./greater_than_equals";
import { write_less_than_equals_expression } from "./less_than_equals";
import { write_if_expression } from "./if";
import { write_block_expression } from "./block";
import { write_const_expression } from "./const";
import { write_call_expression } from "./call";
import { write_multiply_expression } from "./multiply";
import { write_set_local_expression } from "./set_local";
import { write_get_local_expression } from "./get_local";
import { write_loop_expression } from "./loop";
import { write_br_expression } from "./br";
import { write_br_if_expression } from "./br_if";
import { write_not_expression } from "./not";
import { write_list_expression } from "./list";
import { write_divide_expression } from "./divide";
import { write_tee_local_expression } from "./tee_local";
import { write_shift_left_expression } from "./left_shift";
import { write_shift_right_expression } from "./right_shift";
import { write_bitwise_and_expression } from "./bitwise_and";
import { write_bitwise_or_expression } from "./bitwise_or";
import { compiler_assert } from "../../compiler/error";
import { write_get_global_expression } from "./get_global";
import { write_set_global_expression } from "./set_global";
import { write_load_expression } from "./load";
import { write_store_expression } from "./store";
import { write_cast_float_expression } from "./cast_float";
import { write_cast_int_expression } from "./cast_int";
import { write_trap_expression } from "./trap";
import { write_data_ref_expression } from "./data_ref";
import { write_unsafe_cast_expression } from "./unsafe_cast";
import { write_return_expression } from "./return";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;
type WriterFunction = (ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) => void

const expression_types: Map<WASTExpressionType, WriterFunction> = new Map([
	["@list", write_list_expression],
	["trap", write_trap_expression],
	
	["add", write_add_expression],
	["sub", write_sub_expression],
	["multiply", write_multiply_expression],
	["divide", write_divide_expression],
	
	["equals", write_equals_expression],
	["not_equals", write_not_equals_expression],
	["less_than", write_less_than_expression],
	["greater_than", write_greater_than_expression],
	["greater_than_equals", write_greater_than_equals_expression],
	["less_than_equals", write_less_than_equals_expression],
	["not", write_not_expression],

	["convert_float", write_cast_float_expression],
	["convert_int", write_cast_int_expression],
	["unsafe_cast", write_unsafe_cast_expression],
	
	["if", write_if_expression],
	["block", write_block_expression],
	["const", write_const_expression],
	["call", write_call_expression],
	["loop", write_loop_expression],
	
	["br", write_br_expression],
	["br_if", write_br_if_expression],
	["return", write_return_expression],
	
	["set_local", write_set_local_expression],
	["get_local", write_get_local_expression],
	["tee_local", write_tee_local_expression],

	["get_global", write_get_global_expression],
	["set_global", write_set_global_expression],

	["load", write_load_expression],
	["store", write_store_expression],

	["left_shift", write_shift_left_expression],
	["right_shift", write_shift_right_expression],
	["bitwise_and", write_bitwise_and_expression],
	["bitwise_or", write_bitwise_or_expression],

	["data_ref", write_data_ref_expression]
]);

export function write_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	expression_writer(node)(ctx, node, write_expression);
}

export function expression_writer(node: WASTExpressionNode) {
	const writer = expression_types.get(node.type);
	compiler_assert(typeof writer === "function", node.source, `Unknown expression type ${node.type}`);
	return writer!;
}