import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTVarRestoreNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_variable_restore_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const { id, is_global, value_type, source, name, expr } = node as WASTVarRestoreNode;

	// push the current value of the variable to the stack
	{
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

	// perform the expression ( ensure the stack depth does not change )
	{
		const stack_depth = ctx.stack_depth;

		write_expression(ctx, expr);

		compiler_assert(ctx.stack_depth === stack_depth, source, "");
	}

	// pop the old variable value and put it back
	{
		ctx.consume_value(value_type.wasm_type(), source);

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
}