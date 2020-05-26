import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTConvertToFloat } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/LangType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_cast_float_expression (ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const cast_node = node as WASTConvertToFloat;

	const target_type = cast_node.value_type.wasm_type();
	const source_type = cast_node.input.value_type;

	write_expression(ctx, cast_node.input);

	ctx.consume_any_value(cast_node.input.source);

	if (target_type === PrimativeTypes.f32) {
		switch (source_type.wasm_type()) {
			case PrimativeTypes.f64:
				ctx.writer.writeUVint(Opcode.f32_demote_f64);
				break;
			case PrimativeTypes.i32:
				ctx.writer.writeUVint(Opcode.f32_convert_i32_s);
				break;
			case PrimativeTypes.i64:
				ctx.writer.writeUVint(Opcode.f32_convert_i64_s);
				break;
			case PrimativeTypes.u32:
				ctx.writer.writeUVint(Opcode.f32_convert_i32_u);
				break;
			case PrimativeTypes.u64:
				ctx.writer.writeUVint(Opcode.f32_convert_i64_u);
				break;
		}
	}
	else {
		switch (source_type.wasm_type()) {
			case PrimativeTypes.f32:
				ctx.writer.writeUVint(Opcode.f64_promote_f32);
				break;
			case PrimativeTypes.i32:
				ctx.writer.writeUVint(Opcode.f64_convert_i32_s);
				break;
			case PrimativeTypes.i64:
				ctx.writer.writeUVint(Opcode.f64_convert_i64_s);
				break;
			case PrimativeTypes.u32:
				ctx.writer.writeUVint(Opcode.f64_convert_i32_u);
				break;
			case PrimativeTypes.u64:
				ctx.writer.writeUVint(Opcode.f64_convert_i64_u);
				break;
		}
	}
	ctx.push_value(target_type);
}