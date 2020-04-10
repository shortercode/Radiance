import { WASTExpressionNode, WASTBlockNode, WASTNodeList } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_expression } from "./expression";

export function write_list_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	
	const list_node = node as WASTNodeList;
	const statements = list_node.nodes;
	
	if (statements.length === 0)
	return;
	
	for (let i = 0; i < statements.length - 1; i++) {
		const subnode = statements[i];
		write_expression(ctx, subnode);
		if (subnode.value_type !== "void") {
			ctx.consume_any_value();
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	{
		const last_subnode = statements[statements.length - 1];
		write_expression(ctx, last_subnode);
		const has_value = last_subnode.value_type !== "void";
		const does_not_emit_value = list_node.value_type === "void"
		if (has_value && does_not_emit_value) {
			ctx.consume_value(last_subnode.value_type);
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	if (list_node.value_type === "void") {
		if (ctx.stack_depth !== 0)
		throw new Error(`Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	else if (ctx.stack_depth !== 1) {
		throw new Error(`Expected 1 values on the stack, but found ${ctx.stack_depth}`);
	}
}