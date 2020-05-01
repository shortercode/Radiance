import { Ref } from "../WASTNode";
import Node from "../pratt/Node";

type PositionOrNode = Ref | Node;

function get_line_number (reference: PositionOrNode) {
	const value = reference.start[0];
	return isNaN(value) ? "?" : value.toString();
}

export function is_defined (val: unknown) {
	return val != null;
}

export function type_assert(condition: boolean, reference: PositionOrNode, str: string) {
	if (condition === false) {
		type_error(reference, str);
	}
}

export function syntax_assert(condition: boolean, reference: PositionOrNode, str: string) {
	if (condition === false) {
		syntax_error(reference, str);
	}
}

export function compiler_assert(condition: boolean, reference: PositionOrNode, str: string) {
	if (condition === false) {
		compiler_error(reference, str);
	}
}

export function type_error(reference: PositionOrNode, str: string): never {
	throw new Error(`TypeError @ ln ${get_line_number(reference)}: ${str}`);
}

export function syntax_error(reference: PositionOrNode, str: string): never {
	throw new Error(`SyntaxError @ ln ${get_line_number(reference)}: ${str}`);
}

export function compiler_error(reference: PositionOrNode, str: string): never {
	throw new Error(`CompilerError @ ln ${get_line_number(reference)}: ${str}`);
}