import { WASTCallNode, WASTExpressionNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { FunctionContext } from "../FunctionContext";
import { compiler_assert } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_call_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const call_node = node as WASTCallNode;
	
	const function_id = ctx.function_lookup.get(call_node.id)!;
	
	compiler_assert(typeof function_id !== "number", node.source, `Cannot find function ${call_node.name}`);

	for (const arg of call_node.arguments) {
		write_expression(ctx, arg);
		ctx.consume_value(arg.value_type.wasm_type(), node.source);
	}
	
	if (call_node.value_type.is_void() === false) {
		ctx.push_value(call_node.value_type.wasm_type());
	}
	
	ctx.writer.writeUint8(Opcode.call);
	ctx.writer.writeUVint(function_id);
}