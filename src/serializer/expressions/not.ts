import { write_expression } from "./expression";
import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTNotNode } from "../../WASTNode";
import { Opcode } from "../OpCode";

export function write_not_expression(ctx: FunctionContext, node: WASTExpressionNode) {
	const not_node = node as WASTNotNode;
	
	const subnode = not_node.inner;
	write_expression(ctx, subnode);

	ctx.consume_value("boolean");
	ctx.writer.writeUint8(Opcode.i32_eqz);
	ctx.push_value("boolean");
}