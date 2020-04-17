import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTLoadNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_load_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const load_node = node as WASTLoadNode;
	
	const location_expression = load_node.location;
	
	write_expression(ctx, location_expression);
	
	ctx.consume_value(PrimativeTypes.i32, node.source);
	
	switch (load_node.value_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_load);
		ctx.push_value(PrimativeTypes.f32);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_load);
		ctx.push_value(PrimativeTypes.f64);
		break;
		case PrimativeTypes.i32:
		ctx.writer.writeUint8(Opcode.i32_load);
		ctx.push_value(PrimativeTypes.i32);
		break;
		case PrimativeTypes.boolean:
		ctx.writer.writeUint8(Opcode.i32_load);
		ctx.push_value(PrimativeTypes.boolean);
		break;
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_load);
		ctx.push_value(PrimativeTypes.i64);
		break;
	}
	/*
		Offset is a fixed value that is added to the location expression
		Alignment is to do with usage of byte blocks... not really sure what the input value should be yet
	*/
	const offset = load_node.offset;
	const alignment = 0;// ?

	ctx.writer.writeUVint(alignment)
	ctx.writer.writeUVint(offset);
}