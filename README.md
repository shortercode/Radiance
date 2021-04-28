# Radiance
Radiance is a simple language that compiles to WebAssembly. It's syntax has a familiar and modern style created by blending choice parts of Swift, Rust and TypeScript. By utilising static type checking it allows you to create safer and more concise code than JavaScript, without hindering you and providing easy integration with your existing JavaScript code.

It's design intention is to be intuative and easy to write, while making the most of what the WebAssembly format has to offer.

```swift
export fn factorial (count: i32) -> i32 {
  let result: i32 = 1;
  let i: i32 = 0
  if count == 0 {
    1
  }
  else {
    while i < count {
      i = i + 1
      result = result * i
    }
  }
}
```

A more in depth look at the language can be found [here](Language%20Features.md).

## Status

You may have noticed it's been a little while since a commit! Well the project is not dead, although it has slowed somewhat. I started this while I was between jobs and had much more time. While working on the somewhat large addition of generics I realised I wanted to change how and when type inference occurs in relation to the parse and compile stages ( take at the struct generics branch if you are interested ). As this would be quite a substantial change I decided to attach some other pieces to it which made sense to resolve at the same time. Hence I am now in the process of rewriting the parser as it's on separate project. The typechecker and the AST definitions will also be separate to the compiler. My hope is that this will enable easier use and growth for the project as a whole, and gives me a chance to break things down into more testable chunks with better defined edges.

As I write this I have effectively finished the parser but am still in the process of writing the somewhat comprehensive tests. The compiler will be the last chunk to be reworked, but I'm hopeful that the time will be worth it. The parser rewrite has definitely resolved some small but long standing issues.

If you are interested in this project and want to help it develop please come say hi on the discussions page.

### Progress

- [ ] Rewrite the parser in it's own package.
- [ ] Define the AST as it's own package.
- [ ] Write an explicit type inference and checking stage, to be executed before compilation.
- [ ] Rewrite the compiler separate from the parser and type checker, integrating the new packages.
- [ ] Create a CLI package to wrap the compiler for AOT compilation.
- [ ] Publish the 5 main packages on npm: parser/ast/type-checker/compiler/cli.

## Installation

Radiance is available via NPM. It can either be used via the CLI or as a library.

```bash
npx radiance-lang hello.rad
```
The library exports the following methods:
```typescript
export declare function compile_string(source: string, filename: string): Uint8Array;

export declare function compile_file(filename: string): Promise<Uint8Array>;

export declare function execute_string(source: string, import_object?: {
  [key: string]: Function;
}): Promise<Record<string, WebAssembly.ExportValue>>;

export declare function execute_file(filename: string, import_object?: {
  [key: string]: Function;
}): Promise<Record<string, WebAssembly.ExportValue>>;
```
It also includes debug variants, these only differ in that they provide performance statistics on the compiler.

## Secondary goal
In part the syntax of this language was developed from the ideas of [Let's stop copying C](https://eev.ee/blog/2016/12/01/lets-stop-copying-c/). The article is well worth a read and discusses multiple evils that C has inspired in other languages, depending on your point of view some of these may be more controvertial than others. [Not based on C](not_based_on_c.md) discusses our take on the article, and what changes this has effected on Radiance.

## Learning the language
There's still a lot to be done on this language, such as the documentation! If you are reasonably technical then a good place to start at the moment is [src/parser/index.test.ts].

## Status
Development is still in a fairly early stage, but the language is usable for certain forms of program. Many language features have been implemented, but some higher level features are still missing requiring users to fall back on older more verbose styles of programming. Below is the implementation status of our planned feature list:

#### Basic features
- [x] Signed integer types ( i32, i64 )
- [x] Unsigned integers
- [x] Floating point types ( f32, f64 )
- [x] Functions
- [x] Logical operators ( not, and, or )
- [x] Bitshift
- [x] Bitwise operators ( and, or )
- [x] Basic math operators ( +, -, *, /, % )
- [x] Comparison operators ( ==, !=, <, >, <=, >= )
- [x] Type casting ( as )
- [x] While loop expressions
- [x] If/else expressions
- [x] Local variables
- [x] Import host functions
- [x] Export functions to host
- [ ] Break/Continue for loops
- [ ] Explicit function return
- [ ] Range literals
- [ ] For...of iterator loop
- [ ] Complex math operators ( sqrt, abs, ceil, floor, round, sign )
- [ ] Module system

#### Complex data types
- [x] Structure
- [x] Tuples
- [ ] Enumerations
- [x] Arrays
- [x] Strings
- [ ] Namespaces
- [ ] Methods
- [ ] Closures
- [ ] Generics
- [ ] Protocols

#### Compiler analysis
- [x] Type inference
- [ ] Escape analysis
- [ ] Object scalar replacement
- [ ] Unused function removal
- [ ] Unused variable removal

#### Syntactic sugar
- [ ] Destructing assignment

## Expression based
Inspired by Rust the majority of the language is expression based. There is no requirement for the ternary conditional expression, as the standard `if` syntax returns a value. Similarly `while` loops emit the result of their last iteration. A block will emit the value of the last expression within it. Functions behave much like blocks, meaning that no return statement is needed with fully described branches.

```swift
fn more_than_twelve (value: i32) -> i32 {
 if value > 12 {
  value
 }
 else {
  0
 }
}
```

## Memory management
Currently Radiance uses a simple but effective system for allocating memory. This is to have a fast bump allocator that is cleared automatically at set intervals. Bump allocators require no header information for allocations and are very fast to allocate/free memory. The downside being that you can effectively only free everything at once, so you can end up with a lot of zombie data.

An example use case for this sort of allocator would be in a game, temporary resources can be allocated quickly using the bump allocator and then cleared at the end of each frame. Games often have strict time budgets for each frame, so simplifying the memory management time is a nice boon for developers.

WebAssembly works by exposing functions to a host, so Radiance clears the allocator when the host calls one of those functions. This occurs at the start of a call. Why the start you might wonder? This means that if the host wishes to read a value back from memory after a call it can do.

The advantage of this system is that the user does not have to do any explicit memory management. Creating an instance of a struct allocates the memory for it, and then when the current callstack is finished the memory is freed automatically. The downside is that the WebAssembly module has no persistence between calls... The solution to this is to have some form of heap which objects can be moved to. How this occurs has yet to be decided, but there are some ideas in the works.

There is one addition to this behaviour which is not immediately obvious. WebAssembly modules can call imported host functions, which can in turn then call the module again. So to prevent memory being cleared in this situation a depth counter is used to decide if the module has been entered recursively.

Now it's important to note this isn't a flawless system, it's possible that an individual function call could allocate a very large amount of memory in a loop, leading to large amounts of zombie data that could be cleared. It's possible to reduce this through improved code analysis during compilation. But importantly this current system meets the initial use case for this language. Which is for set of medium sized functions exposed to the host, which the host calls into. This all may change in the future!
