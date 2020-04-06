import { WASTExpressionNode, WASTBlockNode } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { write_value_type } from "../write_value_type";
import { write_expression } from "./expression";

export function write_block_expression(ctx: FunctionContext, node: WASTExpressionNode) {

	const block_node = node as WASTBlockNode;
	const block_statements = block_node.body;

	if (block_statements.length === 0)
		return;

	ctx.writer.writeUint8(Opcode.block);
	write_value_type(ctx.writer, block_node.value_type);

	for (let i = 0; i < block_statements.length - 1; i++) {
		const subnode = block_statements[i];
		write_expression(ctx, subnode);
		if (subnode.value_type !== "void") {
			ctx.consume_any_value();
			ctx.writer.writeUint8(Opcode.drop);
		}
	}

	{
		const last_subnode = block_statements[block_statements.length - 1];
		write_expression(ctx, last_subnode);
		const has_value = last_subnode.value_type !== "void";
		const does_not_emit_value = block_node.value_type === "void"
		if (has_value && does_not_emit_value) {
			ctx.consume_value(last_subnode.value_type);
			ctx.writer.writeUint8(Opcode.drop);
		}
	}

	if (block_node.value_type === "void") {
			if (ctx.stack_depth !== 0)
					throw new Error(`Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	else if (ctx.stack_depth !== 1) {
			throw new Error(`Expected 1 values on the stack, but found ${ctx.stack_depth}`);
	}

	ctx.writer.writeUint8(Opcode.end);
}