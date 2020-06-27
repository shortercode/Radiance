// TODO merge set_local and set_global

import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTSetVarNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_set_variable_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const { is_global, id, source, name, value } = node as WASTSetVarNode;

	write_expression(ctx, value);
	ctx.consume_value(value.value_type.wasm_type(), source);

	if (is_global) {
		const global_id = ctx.global_lookup.get(id);
		compiler_assert(typeof global_id === "number", source, `Cannot find global ${name}`);
		ctx.writer.writeUint8(Opcode.global_set);
		ctx.writer.writeUVint(global_id!);
	}
	else {
		const local_id = ctx.variable_lookup.get(id);
		compiler_assert(typeof local_id === "number", source, `Cannot find local ${name}`);
		ctx.writer.writeUint8(Opcode.local_set);
		ctx.writer.writeUVint(local_id!);
	}
}