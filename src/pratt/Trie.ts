export default class Trie extends Map {
    value: string | null

    constructor (itr: Iterable<string> | null) {
        super();
        this.value = null;
        if (itr !== null) {
            for (const sym of itr) 
                this.add(sym);
        }
    }
    add (key: string, value: string = key) {
        let node = this;

        for (const char of key) {
            let child = node.get(char);
            if (!child) {
                child = new Trie(null);
                node.set(char, child);
            }
            node = child;
        }

        node.value = value;
    }
    remove (key: string) {
        if (key.length === 0)
            return;

        const path: Array<[Trie, string]> = [];
        let node = this;

        for (const char of key) {
            const child = node.get(char);
            if (!child) return; // branch doesn't exist - exit
            path.push([node, char]);
            node = child;
        }

        // remove leaf
        node.value = null;

        // no children, remove this branch
        if (node.size === 0) {
            const [parent, char] = path.pop()!;
            parent.delete(char);
        }
    }
    find(key: string): string|null {
        let node = this;
        for (const char of key) {
            node = node.get(char);
            if (!node) return null;
        }
        return node.value;
    }
}