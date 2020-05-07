import { FunctionContext } from "../FunctionContext";
import { WASTExpressionNode, WASTNotNode } from "../../WASTNode";
import { Opcode } from "../OpCode";
import { PrimativeTypes } from "../../compiler/AtiumType";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_not_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const not_node = node as WASTNotNode;
	
	const subnode = not_node.inner;
	write_expression(ctx, subnode);
	
	ctx.consume_value(PrimativeTypes.bool, node.source);
	ctx.writer.writeUint8(Opcode.i32_eqz);
	ctx.push_value(PrimativeTypes.bool);
}