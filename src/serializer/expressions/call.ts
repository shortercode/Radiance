import { WASTCallNode, WASTExpressionNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";

export function write_call_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const call_node = node as WASTCallNode;
	
	const function_id = ctx.function_lookup.get(call_node.name);
	
	if (typeof function_id !== "number") {
		throw new Error(`Cannot find function ${call_node.name}`);
	}
	
	for (const arg of call_node.arguments) {
		write_expression(ctx, arg);
		ctx.consume_value(arg.value_type);
	}
	
	if (call_node.value_type !== "void") {
		ctx.push_value(call_node.value_type);
	}
	
	ctx.writer.writeUint8(Opcode.call);
	ctx.writer.writeUVint(function_id);
}