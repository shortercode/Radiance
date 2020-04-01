import { Variable } from "./compiler/Variable";

export interface WASTNode {
    type: string
}

export type WASTExpressionNode = WASTBlockNode | 
    WASTConstNode |
		WASTAddNode |
		WASTSubNode |
    WASTMultiplyNode |
    WASTGetLocalNode |
    WASTSetLocalNode |
    WASTLoadNode |
    WASTStoreNode |
    WASTCallNode;

export type WASTStatementNode = WASTExportNode |
    WASTFunctionNode |
    WASTMemoryNode;

export type WASTType = "f32" | "f64" | "i32" | "i64";

export class WASTModuleNode implements WASTNode {
    type: "module" = "module"

    statements: Array<WASTStatementNode> = []
}

type ExportType = "function" | "table" | "memory" | "global";

export class WASTExportNode implements WASTNode {
    type: "export" = "export"

    name: string
    target: string
    target_type: ExportType

    constructor (type: ExportType, name: string, target: string) {
        this.name = name;
        this.target = target;
        this.target_type = type;
    }
}

export class WASTFunctionNode implements WASTNode {
    type: "function" = "function"

    name: string
    parameters: Array<Variable> = []
    result: WASTType
		body: WASTBlockNode = new WASTBlockNode
		locals: Array<Variable> = []

    constructor (name: string, result: WASTType) {
        this.name = name;
				this.result = result;
    }
}

export class WASTMemoryNode implements WASTNode {
    type: "memory" = "memory"

    name: string
    size: number

    constructor (name: string, size: number) {
        this.name = name;
        this.size = size;
    }
}

export class WASTBlockNode implements WASTNode {
		type: "block" = "block"
		value_type: WASTType | "void"

    body: Array<WASTExpressionNode> = []
}

export class WASTConstNode implements WASTNode {
    type: "const" = "const"

    value_type: WASTType
    value: string

    constructor (type: WASTType, value: string) {
        if (isNaN(parseFloat(value)))
            throw new Error(`Constant must be a valid numeric value`);

        this.value_type = type;
        this.value = value;
    }
}

export class WASTAddNode implements WASTNode {
    type: "add" = "add"

    value_type: WASTType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (type: WASTType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.value_type = type;
        this.left = left;
        this.right = right;
    }
}

export class WASTSubNode implements WASTNode {
	type: "sub" = "sub"

	value_type: WASTType
	left: WASTExpressionNode
	right: WASTExpressionNode

	constructor (type: WASTType, left: WASTExpressionNode, right: WASTExpressionNode) {
			this.value_type = type;
			this.left = left;
			this.right = right;
	}
}

export class WASTMultiplyNode implements WASTNode {
    type: "multiply" = "multiply"

    value_type: WASTType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (type: WASTType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.value_type = type;
        this.left = left;
        this.right = right;
    }
}

export class WASTGetLocalNode implements WASTNode {
		type: "get_local" = "get_local"
		value_type: WASTType

		id: number
		name: string

    constructor (id: number, name: string, type: WASTType) { 
				this.id = id;
				this.name = name;
				this.value_type = type;
    }
}

export class WASTSetLocalNode implements WASTNode {
		type: "set_local" = "set_local"
		value_type: WASTType

		id: number
		name: string
    value: WASTExpressionNode

    constructor (id: number, name: string, value: WASTExpressionNode, type: WASTType) {
				this.id = id;	
				this.name = name;
				this.value = value;
				this.value_type = type;
    }
}

export class WASTLoadNode implements WASTNode {
    type: "load" = "load"

    value_type: WASTType
    location: WASTExpressionNode

    constructor (type: WASTType, location: WASTExpressionNode) {
        this.value_type = type;
        this.location = location;
    }
}

export class WASTStoreNode implements WASTNode {
    type: "store" = "store"

    value_type: WASTType
    location: WASTExpressionNode
    value: WASTExpressionNode

    constructor (type: WASTType, location: WASTExpressionNode, value: WASTExpressionNode) {
        this.value_type = type;
        this.location = location;
        this.value = value;
    }
}

export class WASTCallNode implements WASTNode {
    type: "call" = "call"

		value_type: WASTType | "void"
    name: string
    arguments: Array<WASTExpressionNode>

    constructor (name: string, type: WASTType, args: Array<WASTExpressionNode>) {
				this.name = name;
				this.value_type = type;
				this.arguments = args;
    }
}