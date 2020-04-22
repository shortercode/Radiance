import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTConvertToInt } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_cast_int_expression (ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const cast_node = node as WASTConvertToInt;

	const target_type = cast_node.value_type.wasm_type();
	const source_type = cast_node.input.value_type;

	write_expression(ctx, cast_node.input);

	ctx.consume_any_value(cast_node.input.source);

	if (target_type === PrimativeTypes.i32) {
		switch (source_type.wasm_type()) {
			case PrimativeTypes.i64:
				ctx.writer.writeUVint(Opcode.i32_wrap_i64);
				break;
			case PrimativeTypes.f32:
				ctx.writer.writeUVint(Opcode.i32_trunc_f32_s);
				break;
			case PrimativeTypes.f64:
				ctx.writer.writeUVint(Opcode.i32_trunc_f64_s);
				break;
		}
	}
	else {
		switch (source_type.wasm_type()) {
			case PrimativeTypes.i32:
				ctx.writer.writeUVint(Opcode.i64_extend_i32_s);
				break;
			case PrimativeTypes.f32:
				ctx.writer.writeUVint(Opcode.i64_trunc_f32_s);
				break;
			case PrimativeTypes.f64:
				ctx.writer.writeUVint(Opcode.i64_trunc_f64_s);
				break;
		}
	}
	ctx.push_value(target_type);
}