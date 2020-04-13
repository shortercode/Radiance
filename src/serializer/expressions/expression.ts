import { FunctionContext } from "../FunctionContext.js";
import { WASTExpressionNode, WASTExpressionType } from "../../WASTNode.js";

import { write_add_expression } from "./add.js";
import { write_sub_expression } from "./sub.js";
import { write_equals_expression } from "./equals.js";
import { write_not_equals_expression } from "./not_equals.js";
import { write_less_than_expression } from "./less_than.js";
import { write_greater_than_expression } from "./greater_than.js";
import { write_greater_than_equals_expression } from "./greater_than_equals.js";
import { write_less_than_equals_expression } from "./less_than_equals.js";
import { write_if_expression } from "./if.js";
import { write_block_expression } from "./block.js";
import { write_const_expression } from "./const.js";
import { write_call_expression } from "./call.js";
import { write_multiply_expression } from "./multiply.js";
import { write_set_local_expression } from "./set_local.js";
import { write_get_local_expression } from "./get_local.js";
import { write_loop_expression } from "./loop.js";
import { write_br_expression } from "./br.js";
import { write_br_if_expression } from "./br_if.js";
import { write_not_expression } from "./not.js";
import { write_list_expression } from "./list.js";
import { write_divide_expression } from "./divide.js";
import { write_tee_local_expression } from "./tee_local.js";
import { write_shift_left_expression } from "./left_shift.js";
import { write_shift_right_expression } from "./right_shift.js";
import { write_bitwise_and_expression } from "./bitwise_and.js";
import { write_bitwise_or_expression } from "./bitwise_or.js";
import { compiler_assert } from "../../compiler/error.js";

type WriterFunction = (ctx: FunctionContext, node: WASTExpressionNode) => void

const expression_types: Map<WASTExpressionType, WriterFunction> = new Map([
	["@list", write_list_expression],
	
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
	
	["if", write_if_expression],
	["block", write_block_expression],
	["const", write_const_expression],
	["call", write_call_expression],
	["loop", write_loop_expression],
	
	["br", write_br_expression],
	["br_if", write_br_if_expression],
	
	["set_local", write_set_local_expression],
	["get_local", write_get_local_expression],
	["tee_local", write_tee_local_expression],

	["left_shift", write_shift_left_expression],
	["right_shift", write_shift_right_expression],
	["bitwise_and", write_bitwise_and_expression],
	["bitwise_or", write_bitwise_or_expression]
]);

export function write_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	return expression_writer(node)(ctx, node);
}

export function expression_writer(node: WASTExpressionNode) {
	const writer = expression_types.get(node.type);
	compiler_assert(typeof writer === "function", node.source, `Unknown expression type ${node.type}`);
	return writer!;
}