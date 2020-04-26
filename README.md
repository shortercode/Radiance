# AtiumLang
AtiumLang is a statically typed progamming language that compiles to WebAssembly. It's design intention is to be intuative and easy to write, while making the most of what the WebAssembly format has to offer.

```swift
export func factorial (count: i32) -> i32 {
 let result: i32 = 1;
 let i: i32 = 0
 while i <= count {
  i = i + 1
  result = result * i
 }
}

export func fibonacci(n: i32) -> i32 {
 if n <= 1 {
  n
 }
 else {
  fibonacci(n - 2) + fibonacci(n - 1)
 }
}
```

## Secondary goal
In part the syntax of this language was developed from the ideas of [Let's stop copying C](https://eev.ee/blog/2016/12/01/lets-stop-copying-c/). The article is well worth a read and discusses multiple evils that C has inspired in other languages, depending on your point of view some of these may be more controvertial than others. [Not based on C](not_based_on_c.md) discusses our take on the article, and what changes this has effected on Atium.

## Status
Development is still in a fairly early stage, but the language is usable for certain forms of program. Many language features have been implemented, but some higher level features are still missing requiring users to fall back on older more verbose styles of programming. Below is the implementation status of our planned feature list:

#### Basic features
- [x] Signed integer types ( i32, i64 )
- [ ] Unsigned integers
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
- [ ] Arrays
- [ ] Strings
- [ ] Namespaces
- [ ] Methods
- [ ] Closures
- [ ] Generics

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
func more_than_twelve (value: i32) -> i32 {
 if value > 12 {
  value
 }
 else {
  0
 }
}
```

## Memory management
Currently AtiumLang uses a simple but effective system inspired by a feature the Jai programming language. This is to have a fast bump allocator that is cleared automatically at set intervals. Bump allocators require no header information for allocations and are very fast to allocate/free memory. The downside being that you can effectively only free everything at once, so you can end up with a lot of zombie data.

Jai is intended for game development, hence the allocator clears on each frame. WebAssembly works by exposing functions to a host, so Atium clears the allocator when the host calls one of those functions. This occurs at the start of a call. Why the start you might wonder? This means that if the host wishes to read a value back from memory after a call it can do.

The advantage of this system is that the user does not have to do any explicit memory management. Creating an instance of a struct allocates the memory for it, and then when the current callstack is finished the memory is freed automatically. The downside is that the WebAssembly module has no persistence between calls... The solution to this is to have some form of heap which objects can be moved to. How this occurs has yet to be decided, but there are some ideas in the works.

There is one addition to this behaviour which is not immediately obvious. WebAssembly modules can call imported host functions, which can in turn then call the module again. So to prevent memory being cleared in this situation a depth counter is used to decide if the module has been entered recursively.
 
## Name
*Atium* is a working title for the project
