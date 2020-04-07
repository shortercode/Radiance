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

type WriterFunction = (ctx: FunctionContext, node: WASTExpressionNode) => void

const expression_types: Map<WASTExpressionType, WriterFunction> = new Map([
	["add", write_add_expression],
	["sub", write_sub_expression],
	["multiply", write_multiply_expression],

	["equals", write_equals_expression],
	["not_equals", write_not_equals_expression],
	["less_than", write_less_than_expression],
	["greater_than", write_greater_than_expression],
	["greater_than_equals", write_greater_than_equals_expression],
	["less_than_equals", write_less_than_equals_expression],

	["if", write_if_expression],
	["block", write_block_expression],
	["const", write_const_expression],
	["call", write_call_expression],

	["set_local", write_set_local_expression],
	["get_local", write_get_local_expression]
]);

export function write_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const writer = expression_types.get(node.type);
	if (!writer)
		throw new Error("Unknown expression type");
	writer(ctx, node);
}