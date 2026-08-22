# JavaScript Callback Functions

## What is a Callback Function?

A **callback function** in JavaScript is a function that is passed as an
argument to another function and is called by that function.

Callbacks are especially useful when we want one piece of code to run
after another operation has completed.

Let's understand this with a simple example.

``` javascript
function greet(name, callback) {
    console.log("Hello " + name);
    callback(); // calling the callback
}

function sayBye() {
    console.log("Goodbye!");
}

greet("Karan", sayBye);
```

### Output

``` text
Hello Karan
Goodbye!
```

In the above example, we passed the `sayBye` function as an argument to
`greet`.

``` javascript
greet("Karan", sayBye);
```

Inside the `greet` function, we call:

``` javascript
callback();
```

Therefore, `sayBye` becomes the **callback function**.

The important idea is:

> A callback is a function that is passed to another function so that it
> can be called by that function.

------------------------------------------------------------------------

# Why Are Callback Functions Used in Asynchronous Programming?

In asynchronous programming, some tasks take time to complete.

For example:

-   API requests
-   File operations
-   Timers
-   User interactions
-   Downloading files

JavaScript can start these operations and continue executing other code
instead of blocking everything until the operation finishes.

Callbacks provide a way to say:

> **"When this task is completed, run this function."**

So:

> Callbacks can be used in asynchronous programming to handle operations
> that complete in the future without blocking the execution of other
> code.

------------------------------------------------------------------------

# Callback with `setTimeout()`

Let's understand this using a timer.

``` javascript
function sayHii() {
    console.log("Hii");
}

console.log("Start");

setTimeout(sayHii, 2000);

console.log("End");
```

### Output

``` text
Start
End
Hii
```

Here:

``` javascript
setTimeout(sayHii, 2000);
```

passes `sayHii` as a callback function.

The callback is scheduled to run after approximately 2 seconds.

Notice that JavaScript does not stop at `setTimeout()` waiting for the
timer.

It continues:

``` text
Start
End
```

and later the callback runs:

``` text
Hii
```

------------------------------------------------------------------------

# Callback Functions Don't Have to Be Asynchronous

An important point is that **callbacks are not limited to asynchronous
programming**.

A callback can also be called synchronously.

For example:

``` javascript
function processUser(name, callback) {
    console.log("Processing " + name);
    callback();
}

processUser("Karan", function () {
    console.log("Done");
});
```

### Output

``` text
Processing Karan
Done
```

So:

> A callback is defined by **how a function is passed to another
> function**, not by whether the operation is asynchronous.

Callbacks are used in both synchronous and asynchronous JavaScript.

------------------------------------------------------------------------

# Callback Functions with Anonymous Functions

We don't always need to create a separate named function.

We can directly pass a function as an argument.

``` javascript
function greet(name, callback) {
    console.log("Hello " + name);
    callback();
}

greet("Karan", function () {
    console.log("Goodbye!");
});
```

### Output

``` text
Hello Karan
Goodbye!
```

Here, the callback is an **anonymous function**.

We can also write it using an arrow function:

``` javascript
greet("Karan", () => {
    console.log("Goodbye!");
});
```

------------------------------------------------------------------------

# Callback Hell

Callbacks are useful, but too much nesting can make code difficult to
read and maintain.

When callbacks are nested inside other callbacks again and again, the
code can become deeply nested.

This is commonly called **callback hell**.

## Example

``` javascript
setTimeout(() => {
    console.log("Step 1");

    setTimeout(() => {
        console.log("Step 2");

        setTimeout(() => {
            console.log("Step 3");

            setTimeout(() => {
                console.log("Step 4");
            }, 1000);

        }, 1000);

    }, 1000);

}, 1000);
```

The callbacks are nested inside one another:

``` text
Step 1
   └── Step 2
        └── Step 3
             └── Step 4
```

As the number of nested callbacks grows, the code becomes harder to:

-   Read
-   Understand
-   Debug
-   Maintain

This is one reason modern JavaScript provides **Promises** and
**async/await**.

------------------------------------------------------------------------

# Solving Callback Hell with Promises

Instead of deeply nesting callbacks, we can chain Promises.

``` javascript
doTask1()
    .then(doTask2)
    .then(doTask3)
    .then(doTask4)
    .catch(error => console.log(error));
```

This gives us a more linear structure.

------------------------------------------------------------------------

# Solving Callback Hell with Async/Await

We can also use `async/await`.

``` javascript
async function runTasks() {
    try {
        await doTask1();
        await doTask2();
        await doTask3();
        await doTask4();
    } catch (error) {
        console.log(error);
    }
}
```

This code looks more like normal sequential code and is often easier to
read.

------------------------------------------------------------------------

# Real-World Scenarios Where We Use Callbacks

Callbacks are used throughout JavaScript.

Some common examples include:

-   API or asynchronous operations
-   Button clicks and other user interactions
-   Timers
-   File operations
-   Array methods

Let's look at some examples.

------------------------------------------------------------------------

# 1. Button Click --- User Interaction

``` javascript
document.getElementById("btn").addEventListener("click", function () {
    console.log("Button clicked");
});
```

### Explanation

You don't know exactly when the user will click the button.

So we pass a function as a callback.

``` javascript
function () {
    console.log("Button clicked");
}
```

When the click event occurs, the callback is executed.

The browser's event system calls the callback when the specified event
happens.

------------------------------------------------------------------------

# 2. Food Order Example

Let's understand asynchronous callbacks using a real-world analogy.

``` javascript
function orderFood(callback) {
    console.log("Order placed");

    setTimeout(() => {
        console.log("Food is ready");
        callback();
    }, 2000);
}

orderFood(function () {
    console.log("Eat the food");
});
```

### Output

``` text
Order placed
Food is ready
Eat the food
```

### Explanation

Think about the process:

1.  You place an order.
2.  Food takes some time to prepare.
3.  You don't need to block the entire program while waiting.
4.  When the food is ready, the callback runs.
5.  You can then eat the food.

This demonstrates the idea of:

> **Do this task, and when it is finished, run this function.**

------------------------------------------------------------------------

# 3. Downloading a File

``` javascript
function downloadFile(callback) {
    console.log("Downloading...");

    setTimeout(() => {
        console.log("Download complete");
        callback();
    }, 2000);
}

downloadFile(function () {
    console.log("Open the file");
});
```

### Output

``` text
Downloading...
Download complete
Open the file
```

### Explanation

-   The download takes time.
-   The program can continue doing other work.
-   When the download finishes, the callback runs.
-   The callback can perform the next step.

------------------------------------------------------------------------

# 4. Array Methods

Callbacks are also heavily used with array methods.

For example:

``` javascript
const numbers = [1, 2, 3, 4];

const doubled = numbers.map(function (number) {
    return number * 2;
});

console.log(doubled);
```

### Output

``` text
[2, 4, 6, 8]
```

Here, the function passed to `map()` is a callback.

We can write the same thing using an arrow function:

``` javascript
const doubled = numbers.map(number => number * 2);
```

This shows that callbacks are not only an asynchronous concept.

------------------------------------------------------------------------

# Callback vs Promise vs Async/Await

These concepts are related but different.

  -----------------------------------------------------------------------
  Concept                             Main Idea
  ----------------------------------- -----------------------------------
  Callback                            Pass a function to be called later
                                      or by another function

  Promise                             Represents the eventual result of
                                      an asynchronous operation

  `async/await`                       Cleaner syntax for working with
                                      Promises
  -----------------------------------------------------------------------

A common progression in JavaScript is:

``` text
Callbacks
    ↓
Promises
    ↓
async/await
```

This does not mean callbacks are obsolete. They are still fundamental to
JavaScript and are used extensively in APIs, event handling, and array
methods.

------------------------------------------------------------------------

# Important Points to Remember

-   A **callback** is a function passed as an argument to another
    function.
-   The receiving function can call the callback.
-   Callbacks can be synchronous or asynchronous.
-   `setTimeout()` accepts a callback.
-   Event listeners accept callbacks.
-   Array methods such as `map()` and `filter()` use callbacks.
-   Callbacks are useful for running code after an operation or event.
-   Deeply nested callbacks can lead to **callback hell**.
-   Promises can provide a cleaner way to structure asynchronous
    operations.
-   `async/await` provides a cleaner syntax for working with Promises.

------------------------------------------------------------------------

# Conclusion

Callbacks are a fundamental concept in JavaScript.

They allow functions to be passed as arguments and called by another
function. This makes callbacks useful for many different situations,
including event handling, timers, asynchronous operations, and array
processing.

Callbacks are especially important in asynchronous programming because
they allow us to specify what should happen after an operation
completes.

However, excessive nesting of callbacks can make code difficult to read
and maintain. This is commonly known as **callback hell**.

Modern JavaScript provides **Promises** and **async/await** to make
asynchronous code easier to structure and understand.

Understanding callbacks is therefore an important step toward
understanding **Promises, async/await, event handling, and modern
asynchronous JavaScript**.
