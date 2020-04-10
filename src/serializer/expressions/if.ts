import { WASTExpressionNode, WASTConditionalNode } from "../../WASTNode.js";
import { FunctionContext } from "../FunctionContext.js";
import { write_expression } from "./expression.js";
import { Opcode } from "../OpCode.js";
import { write_value_type } from "../write_value_type.js";

export function write_if_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const expr = node as WASTConditionalNode;
	const does_emit_value = expr.value_type !== "void";
	
	write_expression(ctx, expr.condition);
	ctx.consume_value("boolean");
	ctx.writer.writeUint8(Opcode.if);
	write_value_type(ctx.writer, expr.value_type);
	
	{
		write_expression(ctx, expr.then_branch);
		
		if (does_emit_value) {
			ctx.consume_value(expr.value_type);
		}
	}
	
	if (expr.else_branch !== null) {
		ctx.writer.writeUint8(Opcode.else);
		write_expression(ctx, expr.else_branch);
		if (does_emit_value) {
			ctx.consume_value(expr.value_type);
		}
	}
	
	ctx.writer.writeUint8(Opcode.end);
	if (does_emit_value) {
		ctx.push_value(expr.value_type);
	}
}