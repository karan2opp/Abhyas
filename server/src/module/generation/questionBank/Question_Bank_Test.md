---

topic: Variables
subtopic: Variable Scope
type: mcq
difficulty: easy
marks: 1
---

What is the scope of a variable declared with `let` inside a function?

- [ ] Global scope
- [ ] Function scope
- [x] Block scope
- [ ] Module scope

---

topic: Variables
subtopic: Variable Scope
type: mcq
difficulty: medium
marks: 1
---

Which statement correctly describes the difference between `var` and `let` in JavaScript?

- [ ] `var` is block-scoped, `let` is function-scoped
- [ ] Both are block-scoped
- [x] `var` is function-scoped, `let` is block-scoped
- [ ] Both are function-scoped

---

topic: Variables
subtopic: Variable Scope
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define lexical scope", "Define block scope"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain var vs let vs const scoping", "Explain TDZ for let/const"]
  - name: Example
    weight: 0.3
    key_points: ["Provide code example showing scope differences"]
---

Explain the difference between `var`, `let`, and `const` scoping in JavaScript, including the temporal dead zone.

---

topic: Variables
subtopic: Data Types
type: mcq
difficulty: easy
marks: 1
---

Which of the following is NOT a primitive data type in JavaScript?

- [ ] String
- [ ] Number
- [x] Array
- [ ] Boolean

---

topic: Variables
subtopic: Data Types
type: mcq
difficulty: medium
marks: 1
---

What does `typeof null` return in JavaScript?

- [ ] "null"
- [ ] "undefined"
- [x] "object"
- [ ] "number"

---

topic: Variables
subtopic: Hoisting
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define hoisting", "Define TDZ"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain var hoisting vs let/const TDZ"]
  - name: Example
    weight: 0.15
    key_points: ["Show hoisting code example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Predict output of hoisted code"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain function vs variable hoisting order"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe TDZ errors in edge cases"]
---

Explain JavaScript hoisting in detail, covering `var`, `let`, `const`, and function declarations. Include the temporal dead zone and what happens with function expressions.

---

topic: Variables
subtopic: Hoisting
type: mcq
difficulty: medium
marks: 1
---

What is the output of `console.log(x); var x = 5;`?

- [ ] 5
- [ ] ReferenceError
- [x] undefined
- [ ] null

---

topic: Functions
subtopic: Arrow Functions
type: mcq
difficulty: easy
marks: 1
---

Which syntax correctly defines an arrow function?

- [ ] `function(x) => x * 2`
- [ ] `(x) -> x * 2`
- [x] `(x) => x * 2`
- [ ] `x :=> x * 2`

---

topic: Functions
subtopic: Arrow Functions
type: mcq
difficulty: medium
marks: 1
---

How does an arrow function behave differently from a regular function regarding the `this` keyword?

- [ ] It creates a new `this` binding
- [x] It does not bind its own `this`
- [ ] It binds `this` to the window object always
- [ ] It throws an error when using `this`

---

topic: Functions
subtopic: Arrow Functions
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define arrow function syntax"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain lexical this binding", "Compare with function keyword"]
  - name: Example
    weight: 0.3
    key_points: ["Provide example showing this behavior"]
---

Explain the differences between arrow functions and regular functions, focusing on `this` binding and the `arguments` object.

---

topic: Functions
subtopic: Callbacks
type: descriptive
difficulty: easy
marks: 3
rubric:
  - name: Definition
    weight: 0.4
    key_points: ["Define a callback function"]
  - name: Concept Knowledge
    weight: 0.3
    key_points: ["Explain passing functions as arguments"]
  - name: Example
    weight: 0.3
    key_points: ["Provide a simple callback example"]
---

What is a callback function in JavaScript? Provide a simple example of passing a callback to another function.

---

topic: Functions
subtopic: Callbacks
type: mcq
difficulty: medium
marks: 1
---

Which array method takes a callback function as its argument?

- [ ] `array.length`
- [x] `array.map`
- [ ] `array.push`
- [ ] `array.concat`

---

topic: Functions
subtopic: Callbacks
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define callback", "Define callback hell"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain async callback execution", "Explain error-first callbacks"]
  - name: Example
    weight: 0.15
    key_points: ["Provide nested callback example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Refactor callback hell example"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Compare callbacks with Promises"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe unhandled errors in callbacks"]
---

Explain the problem of callback hell and how nested callbacks can be refactored to avoid deeply nested code.

---

topic: Functions
subtopic: Closures
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define closure"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain lexical environment retention"]
  - name: Example
    weight: 0.15
    key_points: ["Provide counter closure example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Use closure for private variables"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain memory implications of closures"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe closures in loops with let vs var"]
---

What is a closure in JavaScript? Explain how closures are used to create private variables and describe a common pitfall when closures are used inside loops.

---

topic: Functions
subtopic: Closures
type: mcq
difficulty: hard
marks: 1
---

What does this code output?
`for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 100); }`

- [ ] 0 1 2
- [x] 3 3 3
- [ ] 1 2 3
- [ ] 0 0 0

---

topic: Arrays
subtopic: Array Methods
type: mcq
difficulty: easy
marks: 1
---

Which method adds elements to the end of an array?

- [x] push()
- [ ] pop()
- [ ] shift()
- [ ] unshift()

---

topic: Arrays
subtopic: Array Methods
type: mcq
difficulty: medium
marks: 1
---

Which method returns a new array containing only the elements that pass a test function?

- [ ] map()
- [ ] forEach()
- [x] filter()
- [ ] reduce()

---

topic: Arrays
subtopic: Array Methods
type: mcq
difficulty: hard
marks: 1
---

What does `[1, 2, 3].reduce((acc, n) => acc + n, 10)` return?

- [ ] 6
- [ ] 7
- [x] 16
- [ ] 16.5

---

topic: Arrays
subtopic: Iteration
type: descriptive
difficulty: easy
marks: 3
rubric:
  - name: Definition
    weight: 0.4
    key_points: ["Define forEach", "Define map"]
  - name: Concept Knowledge
    weight: 0.3
    key_points: ["Explain difference between map and forEach"]
  - name: Example
    weight: 0.3
    key_points: ["Provide example of both"]
---

Explain the difference between `map()` and `forEach()` when iterating over arrays in JavaScript.

---

topic: Arrays
subtopic: Iteration
type: mcq
difficulty: medium
marks: 1
---

Which statement is TRUE about `forEach()`?

- [ ] It returns a new array
- [x] It does not return a new array
- [ ] It stops when the callback returns false
- [ ] It can only be used on strings

---

topic: Promises
subtopic: Async/Await
type: descriptive
difficulty: easy
marks: 3
rubric:
  - name: Definition
    weight: 0.4
    key_points: ["Define async function", "Define await"]
  - name: Concept Knowledge
    weight: 0.3
    key_points: ["Explain awaiting a Promise"]
  - name: Example
    weight: 0.3
    key_points: ["Provide async/await example"]
---

What is the purpose of `async` and `await` in JavaScript? Provide a simple example.

---

topic: Promises
subtopic: Async/Await
type: mcq
difficulty: medium
marks: 1
---

What does an `async` function always return?

- [ ] A number
- [ ] A string
- [x] A Promise
- [ ] undefined

---

topic: Promises
subtopic: Async/Await
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define Promise", "Define async/await"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain .then() chaining", "Explain await semantics"]
  - name: Example
    weight: 0.15
    key_points: ["Provide comparison example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Convert then-chain to async/await"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain event loop interaction"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe unhandled promise rejections"]
---

Explain the difference between `.then()` chaining and `async/await` for handling asynchronous operations, and how error handling differs between them.

---

topic: Promises
subtopic: Promise Chaining
type: mcq
difficulty: medium
marks: 1
---

What does a `.then()` callback return?

- [ ] A string
- [x] A new Promise
- [ ] A number
- [ ] null

---

topic: Promises
subtopic: Promise Chaining
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define promise chaining"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain how values pass between .then()"]
  - name: Example
    weight: 0.15
    key_points: ["Provide multi-step chained example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Chain dependent async calls"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain catch at end of chain"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe errors mid-chain"]
---

Explain how promise chaining works and how a single `.catch()` at the end of a chain handles errors that occur at any step.

---

topic: Promises
subtopic: Error Handling
type: mcq
difficulty: hard
marks: 1
---

Which is the recommended way to handle errors when using async/await?

- [ ] Using .then() with a reject callback
- [ ] Using .catch() chaining on the promise
- [x] Using a try/catch block inside the async function
- [ ] Using a global window.onerror handler

---

topic: Promises
subtopic: Error Handling
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define promise rejection"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain .catch() and try/catch for async/await"]
  - name: Example
    weight: 0.3
    key_points: ["Provide error handling example"]
---

How do you handle rejected Promises when using `async/await`? Explain the role of try/catch.

---

topic: Objects
subtopic: this keyword
type: mcq
difficulty: easy
marks: 1
---

Inside a regular function called as a method of an object, what does `this` refer to?

- [ ] The global object
- [x] The object the method belongs to
- [ ] The function itself
- [ ] undefined

---

topic: Objects
subtopic: this keyword
type: mcq
difficulty: hard
marks: 1
---

What is `this` in a regular function (non-strict mode) called standalone in the browser?

- [ ] undefined
- [ ] The function
- [x] The global (window) object
- [ ] null

---

topic: Objects
subtopic: this keyword
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define the this keyword"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain this binding rules"]
  - name: Example
    weight: 0.15
    key_points: ["Provide method call example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Predict this in different call patterns"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain arrow function this"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe strict mode behavior"]
---

Explain the four main binding rules for the `this` keyword in JavaScript and how arrow functions change `this` binding.

---

topic: Objects
subtopic: call apply bind
type: mcq
difficulty: medium
marks: 1
---

Which method creates a new function with `this` permanently bound to a specified value?

- [ ] call()
- [ ] apply()
- [x] bind()
- [ ] invoke()

---

topic: Objects
subtopic: call apply bind
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define call, apply, bind"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain differences between call and apply"]
  - name: Example
    weight: 0.15
    key_points: ["Provide call/apply example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Use bind for event handlers"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain when bind returns a new function"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe borrow methods across objects"]
---

Explain the difference between `call()`, `apply()`, and `bind()`. When would you use `bind()` instead of `call()`?

---

topic: Control Flow
subtopic: Conditionals
type: mcq
difficulty: easy
marks: 1
---

Which statement is used to check a condition and execute different code paths in JavaScript?

- [ ] loop
- [x] if-else
- [ ] function
- [ ] array

---

topic: Control Flow
subtopic: Conditionals
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define if/else", "Define ternary operator"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain truthy and falsy values"]
  - name: Example
    weight: 0.3
    key_points: ["Provide conditional example"]
---

Explain how truthy and falsy values affect conditional statements in JavaScript, and when you might use a ternary operator instead of if/else.

---

topic: Control Flow
subtopic: Loops
type: mcq
difficulty: easy
marks: 1
---

Which loop is best suited for iterating over the properties of an object?

- [ ] for loop
- [ ] while loop
- [x] for...in loop
- [ ] do...while loop

---

topic: Control Flow
subtopic: Loops
type: mcq
difficulty: medium
marks: 1
---

What is the key difference between `for...in` and `for...of` loops?

- [ ] for...in is faster
- [x] for...in iterates over keys, for...of iterates over values
- [ ] for...of works on objects
- [ ] There is no difference

---

topic: Basics
subtopic: Variables
type: mcq
difficulty: easy
marks: 1
---

Which statement correctly declares a variable in Python?

- [ ] `let x = 5`
- [ ] `var x = 5`
- [x] `x = 5`
- [ ] `int x = 5`

---

topic: Basics
subtopic: Variables
type: descriptive
difficulty: easy
marks: 3
rubric:
  - name: Definition
    weight: 0.4
    key_points: ["Define dynamic typing"]
  - name: Concept Knowledge
    weight: 0.3
    key_points: ["Explain no explicit type declaration"]
  - name: Example
    weight: 0.3
    key_points: ["Show assigning different types to a variable"]
---

Explain Python's dynamic typing and why you do not need to declare variable types.

---

topic: Basics
subtopic: Data Types
type: mcq
difficulty: easy
marks: 1
---

Which of the following is an immutable data type in Python?

- [ ] list
- [ ] dict
- [x] tuple
- [ ] set

---

topic: Basics
subtopic: Data Types
type: mcq
difficulty: medium
marks: 1
---

What is the output of `print(type(3.14))`?

- [ ] <class 'int'>
- [x] <class 'float'>
- [ ] <class 'double'>
- [ ] <class 'decimal'>

---

topic: Basics
subtopic: Lists
type: mcq
difficulty: easy
marks: 1
---

Which method adds an element to the end of a Python list?

- [ ] add()
- [x] append()
- [ ] insert()
- [ ] push()

---

topic: Basics
subtopic: Lists
type: mcq
difficulty: medium
marks: 1
---

What does list slicing `my_list[1:3]` return for `my_list = [0, 10, 20, 30]`?

- [ ] [0, 10, 20]
- [ ] [10, 20, 30]
- [x] [10, 20]
- [ ] [20, 30]

---

topic: Basics
subtopic: Lists
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define list slicing"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain start:stop:step semantics"]
  - name: Example
    weight: 0.3
    key_points: ["Provide slicing examples"]
---

Explain how list slicing works in Python, including the `start:stop:step` syntax and what happens with negative indices.

---

topic: Functions
subtopic: Function Definition
type: mcq
difficulty: easy
marks: 1
---

Which keyword is used to define a function in Python?

- [ ] function
- [x] def
- [ ] func
- [ ] lambda

---

topic: Functions
subtopic: Function Definition
type: descriptive
difficulty: easy
marks: 3
rubric:
  - name: Definition
    weight: 0.4
    key_points: ["Define function definition"]
  - name: Concept Knowledge
    weight: 0.3
    key_points: ["Explain parameters and return"]
  - name: Example
    weight: 0.3
    key_points: ["Provide a function example"]
---

How do you define a function in Python and return a value from it? Provide an example.

---

topic: Functions
subtopic: Lambdas
type: mcq
difficulty: medium
marks: 1
---

Which of the following is a valid lambda function in Python?

- [x] `lambda x: x * 2`
- [ ] `lambda x { x * 2 }`
- [ ] `lambda(x) -> x * 2`
- [ ] `lambda x => x * 2`

---

topic: Functions
subtopic: Lambdas
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define lambda function"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain single-expression limits"]
  - name: Example
    weight: 0.3
    key_points: ["Provide lambda with map/filter example"]
---

What is a lambda function in Python, and when would you use one instead of a regular named function?

---

topic: OOP
subtopic: Classes
type: mcq
difficulty: medium
marks: 1
---

Which method is called automatically when a Python class instance is created?

- [ ] __str__
- [x] __init__
- [ ] __new__
- [ ] __main__

---

topic: OOP
subtopic: Classes
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define class", "Define instance"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain __init__ and self"]
  - name: Example
    weight: 0.15
    key_points: ["Provide class definition example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Create instances and call methods"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain class vs instance attributes"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe mutable default argument pitfalls"]
---

Explain how classes and objects work in Python, including the role of `__init__`, `self`, and the difference between class and instance attributes.

---

topic: OOP
subtopic: Inheritance
type: mcq
difficulty: medium
marks: 1
---

Which keyword is used to refer to the parent class in Python?

- [ ] parent
- [ ] base
- [x] super()
- [ ] ancestor

---

topic: OOP
subtopic: Inheritance
type: descriptive
difficulty: hard
marks: 6
rubric:
  - name: Definition
    weight: 0.2
    key_points: ["Define inheritance"]
  - name: Concept Knowledge
    weight: 0.2
    key_points: ["Explain method overriding"]
  - name: Example
    weight: 0.15
    key_points: ["Provide inheritance example"]
  - name: Correct Application
    weight: 0.15
    key_points: ["Use super() to call parent methods"]
  - name: Depth of Reasoning
    weight: 0.15
    key_points: ["Explain multiple inheritance and MRO"]
  - name: Edge Cases
    weight: 0.15
    key_points: ["Describe diamond problem"]
---

Explain inheritance in Python, including method overriding and the use of `super()`. How does Python resolve method resolution order in multiple inheritance?

---

topic: Solar System
subtopic: Planets
type: mcq
difficulty: easy
marks: 1
---

Which planet is known as the Red Planet?

- [ ] Venus
- [x] Mars
- [ ] Jupiter
- [ ] Mercury

---

topic: Solar System
subtopic: Planets
type: mcq
difficulty: medium
marks: 1
---

Which planet has the most moons in the Solar System?

- [ ] Earth
- [ ] Mars
- [x] Saturn
- [ ] Mercury

---

topic: Solar System
subtopic: Planets
type: descriptive
difficulty: medium
marks: 4
rubric:
  - name: Definition
    weight: 0.3
    key_points: ["Define inner and outer planets"]
  - name: Concept Knowledge
    weight: 0.4
    key_points: ["Explain differences in composition and size"]
  - name: Example
    weight: 0.3
    key_points: ["Provide examples of each group"]
---

Explain the difference between the inner (terrestrial) planets and the outer (gas giant) planets of the Solar System.
