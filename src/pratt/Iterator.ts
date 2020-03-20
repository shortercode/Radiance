export default class ControlledIterator<T> {
    private _iterator: Iterator<T>
    private _previous: IteratorResult<T> | null
    private _current: IteratorResult<T>
    private _next: IteratorResult<T>
    private _future: IteratorResult<T> | null

    constructor (iterable: Iterable<T>) {
        const itr = iterable[Symbol.iterator]();
        this._iterator = itr;
        this._previous = null;
        this._current = itr.next();
        this._next = itr.next();
        this._future = null;
    }
    next (): IteratorResult<T> {
        this._previous = this._current;
        this._current = this._next;
        this._next = this._future || this._iterator.next();
        this._future = null;

        return this._previous;
    }
    incomplete (): boolean {
        return !this._current.done;
    }
    consume (): T | null {
        return this.next().value;
    }
    back () {
        if (this._previous === null)
            throw new Error("Exceeded step back buffer length");

        this._future = this._next;
        this._next = this._current;
        this._current = this._previous;
        this._previous = null;
    }
    previous (): T | null {
        return this._previous && this._previous.value;
    }
    peek (): T | null {
        return this._current.value;
    }
    peekNext (): T | null {
        return this._next.value;
    }
    [Symbol.iterator] () {
        return this;
    }
}