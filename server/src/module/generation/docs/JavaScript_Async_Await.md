# Async/Await in JavaScript

Hey everyone! In this blog, we are going to learn about **async/await in
JavaScript**.

------------------------------------------------------------------------

# What is Async/Await?

`async/await` is a modern way to handle asynchronous operations in
JavaScript.

It helps us write asynchronous code in a cleaner and more readable way,
similar to normal step-by-step code.

There are two important keywords:

-   `async`
-   `await`

### `async`

The `async` keyword is used before a function.

An `async` function always returns a **Promise**.

### `await`

The `await` keyword is used inside an `async` function to wait for a
Promise to settle before continuing with the next line of that
particular `async` function.

------------------------------------------------------------------------

# Example

``` javascript
function fetchData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Data received");
        }, 2000);
    });
}

async function getData() {
    console.log("Start");

    const result = await fetchData();

    console.log(result);
    console.log("End");
}

getData();
```

### Output

``` text
Start
Data received
End
```

Here:

``` javascript
const result = await fetchData();
```

waits for the Promise returned by `fetchData()` to settle before the
`getData()` function continues to the next line.

------------------------------------------------------------------------

# Why Was Async/Await Introduced?

Before `async/await`, JavaScript mainly used **callbacks** and
**Promises** to work with asynchronous operations.

Both approaches are still important, but complex asynchronous logic can
sometimes become harder to read.

------------------------------------------------------------------------

# Problem with Callbacks: Callback Hell

When callbacks are nested inside other callbacks repeatedly, the code
can become deeply nested.

For example:

``` javascript
getData(function () {
    getMoreData(function () {
        getEvenMoreData(function () {
            console.log("Done");
        });
    });
});
```

As the number of nested callbacks increases, the code becomes harder to:

-   Read
-   Understand
-   Debug
-   Maintain

This type of deeply nested callback structure is commonly called
**callback hell**.

------------------------------------------------------------------------

# Promises Improved the Structure

Promises can reduce callback nesting by allowing us to chain
asynchronous operations.

``` javascript
getData()
    .then(() => getMoreData())
    .then(() => getEvenMoreData())
    .catch(error => console.log(error));
```

This is generally easier to read than deeply nested callbacks.

However, long Promise chains can still become difficult to manage when
the logic becomes complex.

------------------------------------------------------------------------

# Async/Await

With `async/await`, we can write asynchronous operations in a
step-by-step style.

``` javascript
async function runTasks() {
    try {
        await getData();
        await getMoreData();
        await getEvenMoreData();

        console.log("Done");
    } catch (error) {
        console.log(error);
    }
}
```

This code looks similar to normal sequential code and is often easier to
understand.

------------------------------------------------------------------------

# Does `await` Block JavaScript?

A very important point is that `await` does **not** block the entire
JavaScript program or stop the event loop.

It pauses the execution of the **current async function** until the
awaited Promise settles.

Consider this example:

``` javascript
function delay() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Done");
        }, 2000);
    });
}

async function test() {
    console.log("Start");

    const result = await delay();

    console.log(result);
    console.log("End");
}

console.log("Before function");

test();

console.log("After function");
```

### Output

``` text
Before function
Start
After function
Done
End
```

Let's understand the execution.

First:

``` javascript
console.log("Before function");
```

prints:

``` text
Before function
```

Then:

``` javascript
test();
```

starts executing the `test()` function.

Inside `test()`:

``` javascript
console.log("Start");
```

prints:

``` text
Start
```

Then:

``` javascript
const result = await delay();
```

pauses the `test()` function while the Promise is pending.

But JavaScript does **not** stop the entire program.

So execution returns to the surrounding code and:

``` javascript
console.log("After function");
```

prints:

``` text
After function
```

After approximately two seconds, the Promise settles and `test()`
continues:

``` text
Done
End
```

This is why `await` should be understood as:

> **Pause this async function, not the entire JavaScript program.**

------------------------------------------------------------------------

# Error Handling with Async Code

When working with asynchronous code, errors can happen during:

-   API calls
-   File operations
-   Database operations
-   Timers
-   Other asynchronous tasks

JavaScript provides different ways to handle errors depending on whether
we use Promises directly or `async/await`.

------------------------------------------------------------------------

# Error Handling with Promises

With Promises, we commonly use `.catch()` to handle rejected Promises.

### Example

``` javascript
function fetchData() {
    return new Promise((resolve, reject) => {
        let success = false;

        if (success) {
            resolve("Data fetched successfully");
        } else {
            reject("Something went wrong");
        }
    });
}

fetchData()
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        console.log(error);
    });
```

### Output

``` text
Something went wrong
```

### Explanation

If the Promise is fulfilled, `.then()` runs.

If the Promise is rejected, `.catch()` handles the rejection.

In this example:

``` javascript
let success = false;
```

so:

``` javascript
reject("Something went wrong");
```

is executed.

Therefore, `.catch()` receives the error.

------------------------------------------------------------------------

# Error Handling with Async/Await

With `async/await`, we commonly use `try...catch`.

### Example

``` javascript
function fetchData() {
    return new Promise((resolve, reject) => {
        let success = false;

        if (success) {
            resolve("Data fetched successfully");
        } else {
            reject("Something went wrong");
        }
    });
}

async function getData() {
    try {
        const result = await fetchData();

        console.log(result);
    } catch (error) {
        console.log(error);
    }
}

getData();
```

### Output

``` text
Something went wrong
```

### Explanation

The `try` block contains the asynchronous code:

``` javascript
const result = await fetchData();
```

If the Promise is fulfilled, the code continues normally.

If the Promise is rejected, control moves to the `catch` block:

``` javascript
catch (error) {
    console.log(error);
}
```

This makes error handling easy to read.

------------------------------------------------------------------------

# Async/Await with API Requests

A common use of `async/await` is fetching data from an API.

For example:

``` javascript
async function getUsers() {
    try {
        const response = await fetch("https://api.example.com/users");

        const users = await response.json();

        console.log(users);
    } catch (error) {
        console.log("Failed to fetch users:", error);
    }
}
```

The code reads almost like a sequence of normal steps:

``` text
1. Request the users
2. Wait for the response
3. Convert the response to JSON
4. Use the users
5. Handle an error if something goes wrong
```

This is one reason `async/await` is popular in modern JavaScript
applications.

------------------------------------------------------------------------

# Promises vs Async/Await

  -----------------------------------------------------------------------
  Promises                            Async/Await
  ----------------------------------- -----------------------------------
  Uses `.then()` and `.catch()`       Uses `await` and `try...catch`

  Can become harder to read in long   Often looks like normal
  chains                              step-by-step code

  Good for Promise chaining           Good for complex sequential
                                      asynchronous logic

  Error handling commonly uses        Error handling commonly uses
  `.catch()`                          `try...catch`

  Works directly with Promise methods Built on top of Promises
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Async/Await is Built on Promises

An important thing to understand is that `async/await` does **not
replace Promises**.

Instead, `async/await` is syntax that makes working with Promises
easier.

For example:

``` javascript
function getData() {
    return Promise.resolve("Data received");
}
```

We can use it with `await`:

``` javascript
async function showData() {
    const result = await getData();

    console.log(result);
}

showData();
```

### Output

``` text
Data received
```

So understanding Promises is important before learning async/await.

------------------------------------------------------------------------

# Important Points to Remember

-   `async` is used to define an asynchronous function.
-   An `async` function always returns a Promise.
-   `await` is used inside an `async` function.
-   `await` pauses the current async function until the awaited Promise
    settles.
-   `await` does not block the entire JavaScript program.
-   `await` does not block the event loop.
-   `try...catch` can be used to handle errors with async/await.
-   Promises use `.then()` for fulfilled results and `.catch()` for
    rejected results.
-   Async/await is built on top of Promises.
-   Async/await often makes sequential asynchronous logic easier to
    read.
-   Callbacks, Promises, and async/await are all important concepts in
    asynchronous JavaScript.

------------------------------------------------------------------------

# Quick Revision

### Basic Async Function

``` javascript
async function getData() {
    return "Hello";
}
```

Because the function is `async`, it returns a Promise.

------------------------------------------------------------------------

### Using `await`

``` javascript
async function getData() {
    const result = await fetchData();

    console.log(result);
}
```

`await` pauses this async function until the Promise settles.

------------------------------------------------------------------------

### Error Handling

``` javascript
async function getData() {
    try {
        const result = await fetchData();

        console.log(result);
    } catch (error) {
        console.log(error);
    }
}
```

------------------------------------------------------------------------

### Promise Version

``` javascript
fetchData()
    .then(result => console.log(result))
    .catch(error => console.log(error));
```

------------------------------------------------------------------------

# Conclusion

Async/await is a modern and cleaner way to handle asynchronous code in
JavaScript.

It helps developers write asynchronous code that looks simple and
readable, similar to synchronous step-by-step code, while still working
with asynchronous operations such as:

-   API calls
-   File handling
-   Database queries
-   Timers
-   Uploads and downloads

Before async/await, JavaScript mainly used callbacks and Promises.
Callbacks could lead to callback hell, while Promises improved the
structure but could still become difficult to read when asynchronous
logic became complex.

With async/await, we can write step-by-step code using `await`, making
it easier to understand, debug, and maintain.

Error handling also becomes simpler with `try...catch`, which provides a
familiar way to handle rejected Promises.

The most important thing to remember is:

> **`async/await` is built on top of Promises.**

Understanding async/await is an important step toward writing clean and
maintainable asynchronous JavaScript applications.
