import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTGetVarNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

export function write_get_variable_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const { id, is_global, value_type, source, name } = node as WASTGetVarNode;

	if (is_global) {
		const global_id = ctx.global_lookup.get(id);
		compiler_assert(typeof global_id === "number", source, `Cannot find global ${name}`);
		ctx.writer.writeUint8(Opcode.global_get);
		ctx.writer.writeUVint(global_id!);
	}
	else {
		const local_id = ctx.variable_lookup.get(id);
		compiler_assert(typeof local_id === "number", source, `Cannot find local ${name}`);
		ctx.writer.writeUint8(Opcode.local_get);
		ctx.writer.writeUVint(local_id!);
	}
	ctx.push_value(value_type.wasm_type());
}