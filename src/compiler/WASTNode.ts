export interface WASTNode {
    type: string
}

export type WASTExpressionNode = WASTBlockNode | 
    WASTConstNode |
    WASTAddNode |
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
    type: "module"

    statements: Array<WASTStatementNode> = []
}

export class WASTExportNode implements WASTNode {
    type: "export"

    name: string
    target: string

    constructor (name: string, target: string) {
        this.name = name;
        this.target = target;
    }
}

export class WASTFunctionNode implements WASTNode {
    type: "function"

    name: string
    parameters: Array<WASTType> = []
    result: WASTType
    body: WASTBlockNode = new WASTBlockNode

    constructor (name: string, result: WASTType) {
        this.name = name;
        this.result = result;
    }
}

export class WASTMemoryNode implements WASTNode {
    type: "memory"

    name: string
    size: number

    constructor (name: string, size: number) {
        this.name = name;
        this.size = size;
    }
}

export class WASTBlockNode implements WASTNode {
    type: "block"

    body: Array<WASTExpressionNode> = []
}

export class WASTConstNode implements WASTNode {
    type: "const"

    subtype: WASTType
    value: string

    constructor (subtype: WASTType, value: string) {
        if (isNaN(parseFloat(value)))
            throw new Error(`Constant must be a valid numeric value`);

        this.subtype = subtype;
        this.value = value;
    }
}

export class WASTAddNode implements WASTNode {
    type: "add"

    subtype: WASTType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (subtype: WASTType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.subtype = subtype;
        this.left = left;
        this.right = right;
    }
}

export class WASTMultiplyNode implements WASTNode {
    type: "multiply"

    subtype: WASTType
    left: WASTExpressionNode
    right: WASTExpressionNode

    constructor (subtype: WASTType, left: WASTExpressionNode, right: WASTExpressionNode) {
        this.subtype = subtype;
        this.left = left;
        this.right = right;
    }
}

export class WASTGetLocalNode implements WASTNode {
    type: "get_local"

    name: string

    constructor (name: string) { 
        this.name = name;
    }
}

export class WASTSetLocalNode implements WASTNode {
    type: "set_local"

    name: string
    value: WASTExpressionNode

    constructor (name: string, value: WASTExpressionNode) {
        this.name = name;
        this.value = value;
    }
}

export class WASTLoadNode implements WASTNode {
    type: "load"

    subtype: WASTType
    location: WASTExpressionNode

    constructor (subtype: WASTType, location: WASTExpressionNode) {
        this.subtype = subtype;
        this.location = location;
    }
}

export class WASTStoreNode implements WASTNode {
    type: "store"

    subtype: WASTType
    location: WASTExpressionNode
    value: WASTExpressionNode

    constructor (subtype: WASTType, location: WASTExpressionNode, value: WASTExpressionNode) {
        this.subtype = subtype;
        this.location = location;
        this.value = value;
    }
}

export class WASTCallNode implements WASTNode {
    type: "call"

    name: string
    arguments: Array<WASTExpressionNode> = []

    constructor (name: string) {
        this.name = name;
    }
}