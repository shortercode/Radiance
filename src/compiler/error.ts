import { SourceReference } from "../WASTNode.js";
import Node from "../pratt/Node.js";

type PositionOrNode = SourceReference | Node;

function resolve_position(reference: PositionOrNode): SourceReference {
	if (reference instanceof Node) {
		return SourceReference.from_node(reference);
	}
	else {
		return reference;
	}
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
	throw new Error(`TypeError @ ln ${reference.start[0]}: ${str}`);
}

export function syntax_error(reference: PositionOrNode, str: string): never {
	throw new Error(`SyntaxError @ ln ${reference.start[0]}: ${str}`);
}

export function compiler_error(reference: PositionOrNode, str: string): never {
	throw new Error(`CompilerError @ ln ${reference.start[0]}: ${str}`);
}