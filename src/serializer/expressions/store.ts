import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTStoreNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_store_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const store_node = node as WASTStoreNode;
	
	const value_expression = store_node.value;
	const location_expression = store_node.location;
	
	write_expression(ctx, location_expression);
	write_expression(ctx, value_expression);
	
	ctx.consume_value(value_expression.value_type.wasm_type(), node.source);
	ctx.consume_value(PrimativeTypes.i32, node.source);
	
	switch (value_expression.value_type.wasm_type()) {
		case PrimativeTypes.f32:
		ctx.writer.writeUint8(Opcode.f32_store);
		break;
		case PrimativeTypes.f64:
		ctx.writer.writeUint8(Opcode.f64_store);
		break;
		case PrimativeTypes.u32:
		case PrimativeTypes.i32:
		case PrimativeTypes.boolean:
		ctx.writer.writeUint8(Opcode.i32_store);
		break;
		case PrimativeTypes.u64:
		case PrimativeTypes.i64:
		ctx.writer.writeUint8(Opcode.i64_store);
		break;
	}
	/*
		Offset is a fixed value that is added to the location expression
		Alignment is to do with usage of byte blocks... not really sure what the input value should be yet
	*/
	const offset = store_node.offset;
	const alignment = 0;// ?

	ctx.writer.writeUVint(alignment)
	ctx.writer.writeUVint(offset);
}