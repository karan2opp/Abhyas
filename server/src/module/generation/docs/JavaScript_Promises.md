Hey, think about a student who wants to pursue his study in abroad so
for that he applied for a visa and after applying he is waiting for
response from embassy , his request might get approved and might get
denied after some time not immediately get reply. The visa request can
have three possible outcomes:

The Three phases during this process:

-   `Waiting` : The application has reached the embassy, but the
    decision has not been made yet.
-   `Approved` : The embassy has granted the visa to the person .
-   `Denied`: The embassy has rejected the visa application .

The promises in js are also similar to a visa request when we sent a
request to a server it does get response immediately it took some time
.As we have see the three states in a visa request that is pending ,
approved and denied , a promise object also have three state pending ,
resolved , rejected.

## Promise:

A Promise is a JavaScript object that represents the eventual completion
or failure of an asynchronous operation and its resulting value.

Three States of a Promise:

### Pending:

This pending phase of promise is similar to pending phase of a visa
application .

When a student applies for a visa, the application reaches the embassy,
but it takes some time to be processed. During this time, no decision
has been made yet.

Similarly in promises the pending state representing that your request
has been sent to the server but for now the response is not received .
The operation is still in progress.

In the future, the response will come, and it can either:

-   Be **fulfilled (resolved)** → if the operation succeeds ✅
-   Be **rejected** → if the operation fails ❌

### Resolved:

This resolved state of promise is similar to approved phase of a visa
application.

The embassy has approved the visa to the student and sent him a visa
letter .

Similarly in promises when the operation has successfully completed the
promises get resolved.

### Rejected:

This resolved state of promise is similar to approved phase of a visa
application.

The embassy has denied the visa application of the student .

Similarly in promises when the operation has failed due to some reason
the promises get rejected.

## Comparison of states of Visa Application and JavaScript Promise

## The Complete Life cycle of a promise:

### Important note:

> Once a Promise is fulfilled or rejected, it becomes settled, and its
> state cannot change again.

Now that we understand what a Promise is, let's see how to create one
and how it gets resolved or rejected.

## How to create a promise?

    const visaPromise = new Promise((resolve, reject) => {

    //asynchronous task

    }

This is the syntax for creating a Promise using the `new` keyword and
the `Promise` constructor.

The constructor takes a **callback function** as an argument. This
callback itself receives two functions as parameters:

-   `resolve`
-   `reject`

These functions are provided by JavaScript.

## How Does a Promise Get Resolved or Rejected?

To **fulfill** (resolve) a Promise, we call the `resolve()` function.

To **reject** a Promise, we call the `reject()` function.

Example using your visa analogy:

    const visaPromise = new Promise((resolve, reject) => {
        let visaApproved = true;

        if (visaApproved) {
            resolve("Visa Approved 🎉");
        } else {
            reject("Visa Denied ❌");
        }
    });

### What Happens Here?

-   The Promise starts in the **pending** state.
-   If `visaApproved` is `true`, we call `resolve()` → Promise becomes
    **fulfilled**.
-   If `visaApproved` is `false`, we call `reject()` → Promise becomes
    **rejected**.

### Important Note

> The executor function inside the Promise runs immediately when the
> Promise is created.

### How to Consume a promise:

We have two ways to consume a promise in js:

-   .then() , .catch() and finally()
-   async and await

### Let first understand how then and catch is used to consume a promise.

### `.then()` Method:

The `.then()` method is executed when a Promise is **fulfilled
(resolved)**.

we pass a callback function inside `then` .

This callback runs after the Promise is successfully completed.

### Role of `.then()`

-   It receives the **fulfilled value** of the Promise.
-   It executes the callback function with that value.
-   It returns a **new Promise**, which allows chaining.

### Example:

    visaPromise
      .then((message) => {
          console.log(message);
      });

### What happens here?

-   If the Promise is fulfilled,
-   The value passed to `resolve()` becomes the argument (`message`)
-   The callback function runs.

### `.catch()` Method:

The `.catch()` method is executed when a Promise is **rejected**.

We pass a callback function inside `.catch()`. This callback runs when
the Promise fails.

------------------------------------------------------------------------

### Role of `.catch()`

-   It receives the **rejection reason (error)** of the Promise.
-   It executes the callback function with that error.
-   It also returns a **new Promise**, which allows further chaining.

### Example:

    visaPromise
      .catch((error) => {
          console.log(error);
      });

### `.finally()` Method:

The `.finally()` method runs **after a Promise is settled**, whether it
is fulfilled or rejected.

It does not care about success or failure.

------------------------------------------------------------------------

### Role of `.finally()`

-   It executes a callback after the Promise is settled.
-   It does **not receive** the fulfilled value or rejection reason.
-   It is mainly used for cleanup tasks.

### Visa Analogy for `.then()`, `.catch()`, and `.finally()`

Think of a Promise like a student's visa application.

The student applies and waits for the embassy's decision.

After some time, the embassy gives the result.

### ✅ `.then()` → Executes When Visa is Approved

Think of it like this:

If the visa gets approved, the student feels happy and starts preparing
for travel.

Similarly:

-   `.then()` runs when the Promise is **fulfilled**.
-   It receives the success value.
-   It handles what should happen after success.

👉 Visa approved → `.then()` executes.

------------------------------------------------------------------------

### ❌ `.catch()` → Executes When Visa is Rejected

Now imagine the embassy denies the visa.

The student receives the rejection letter and decides what to do next.

Similarly:

-   `.catch()` runs when the Promise is **rejected**.
-   It receives the rejection reason (error).
-   It handles the failure case.

👉 Visa denied → `.catch()` executes.

------------------------------------------------------------------------

### `.finally()` → Executes in Both Cases

Whether the visa is approved or denied, the visa process is now over.

The student:

-   Stops waiting
-   Closes the application file
-   Updates the status

Similarly:

-   `.finally()` runs when the Promise is **settled** (either fulfilled
    or rejected).
-   It does not receive any value or error.
-   It is used for cleanup tasks.

👉 Visa decision made → `.finally()` executes.

### Example:

    const visaPromise = new Promise((resolve, reject) => {
        let visaApproved = false;

        if (visaApproved) {
            resolve("Visa Approved 🎉");
        } else {
            reject("Visa Denied ❌");
        }
    });

    visaPromise
        .then((message) => {
            console.log("Congratulations:", message);
        })
        .catch((error) => {
            console.log("Unfortunately:", error);
        })
        .finally(() => {
            console.log("Visa process completed.");
        });

### What Happens Here?

If `visaApproved = true`:

    //Output 
    Congratulations: Visa Approved 🎉
    Visa process completed.

If `visaApproved = false`:

    Unfortunately: Visa Denied ❌
    Visa process completed.

## Consume promise using async and await.

We can also consume a promise using async and await .

The await pauses the execution of the function until the Promise is
settled.

we always use async with await.

### Example:

    function applyForVisa() {
        return new Promise((resolve, reject) => {
            let visaApproved = true;

            if (visaApproved) {
                resolve("Visa Approved 🎉");
            } else {
                reject("Visa Denied ❌");
            }
        });
    }

Now consuming it:

    async function checkVisaStatus() {
        try {
            const message = await applyForVisa();
            console.log("Congratulations:", message);
        } catch (error) {
            console.log("Unfortunately:", error);
        } finally {
            console.log("Visa process completed.");
        }
    }

    checkVisaStatus();

### What's Happening Here?

-   `async` → makes a function return a Promise.
-   `await` → waits for the Promise to resolve or reject.
-   `try...catch` → handles errors (like `.then()` and `.catch()`).
-   `finally` → works same as Promise `.finally()`.

### Comparison between then catch and async await

  --
  --

Promise Style

async/await Style

  --
  --

`.then()`

  --
  --

`await`

  --
  --

`.catch()`

  --
  --

`try...catch`

  --
  --

`.finally()`

  --
  --

`finally` block

### Important Note:

> async/await does not replace Promises --- it is just a cleaner syntax
> built on top of Promises.

### 🎓 Handling Multiple Visa Applications (Promise Methods)

Imagine not just one student, but **multiple students** applying for
visas.

Now we'll understand how JavaScript handles multiple Promises.

------------------------------------------------------------------------

### `Promise.all()` → Everyone Must Get Visa

### 🎓 Analogy

Four friends want to go abroad together.

-   Rahul
-   Aman
-   Neha
-   Priya

They decide:

> "We will travel only if ALL of us get our visas."

If even one person's visa gets rejected → the trip is cancelled.

That's exactly how `Promise.all()` works.

------------------------------------------------------------------------

### ✅ Rule of `Promise.all()`

-   Resolves when **ALL promises are fulfilled**
-   Rejects immediately if **ANY one promise fails**

```{=html}
<!-- -->
```
    Promise.all([visa1, visa2, visa3, visa4])
        .then((results) => {
            console.log("All visas approved 🎉", results);
        })
        .catch((error) => {
            console.log("Trip cancelled ❌", error);
        });

### What happens here?

-   `Promise.all()` takes multiple promises.
-   It waits for **all of them** to be fulfilled.
-   If all succeed → `.then()` runs and `results` is an array of all
    resolved values.
-   If any one promise fails → it immediately goes to `.catch()`.

### `Promise.any()` → First Approval Wins

### 🎓 Analogy

Now the student applies to 3 countries and says:

> "I just need ONE visa approval."

-   If one country approves → done.
-   If all reject → only then it fails.

------------------------------------------------------------------------

### ✅ Rule of `Promise.any()`

-   Resolves when **first promise fulfills**
-   Rejects only if **ALL promises reject**

### Example:

    Promise.any([visa1, visa2, visa3])
        .then((result) => {
            console.log("Got at least one visa 🎉", result);
        })
        .catch((error) => {
            console.log("All visas rejected ❌");
        });

### What happens here?

-   `Promise.any()` takes multiple promises.
-   It waits until **one promise is fulfilled**.
-   As soon as the first promise resolves → `.then()` runs.
-   If **all promises reject** → `.catch()` runs.

### `Promise.race()` → First Decision Wins

### 🎓 Analogy

A student applies to 3 countries.

He says:

> "Whichever embassy responds first, I'll accept that decision."

It doesn't matter if it's approval or rejection.

The first decision wins.

------------------------------------------------------------------------

### ✅ Rule of `Promise.race()`

-   Settles as soon as the **first promise settles**
-   Can resolve or reject

### Example:

    Promise.race([visa1, visa2, visa3])
        .then((result) => {
            console.log("First response:", result);
        })
        .catch((error) => {
            console.log("First response:", error);
        });

### What happens here?

-   `Promise.race()` takes multiple promises.
-   It settles as soon as the **first promise settles**.
-   It does NOT wait for all promises.
-   The first one to either resolve or reject decides the result.

### `Promise.allSettled()` → Wait for All Decisions

## 🎓 Analogy

Now imagine a student has applied for visas to multiple countries.

He says:

> "I will decide where to go only after all the visa results are
> declared."

He wants to know:

-   Which country approved his visa ✅
-   Which country rejected his visa ❌

Even if 3 countries reject and 1 approves, he still wants to see **all
the results** before making a decision.

That is exactly how `Promise.allSettled()` works.

------------------------------------------------------------------------

### ✅ What Happens in `Promise.allSettled()`?

-   It waits for **all promises to settle**.
-   It does NOT fail if one promise rejects.
-   It always resolves.
-   It returns an array showing the status of each promise.

### Example:

    Promise.allSettled([visa1, visa2, visa3])
        .then((results) => {
            console.log(results);
        });

    //Output
    [
      { status: "fulfilled", value: "USA Visa Approved" },
      { status: "rejected", reason: "Canada Visa Denied" },
      { status: "rejected", reason: "UK Visa Denied" }
    ]

### Important Note:

> The results array always maintains the same order as the input
> promises, regardless of which promise finishes first.

### Conclusion:

Promises in JavaScript help us handle asynchronous operations in a
structured and readable way.

Just like a visa application goes through different stages --- pending,
approved, or denied --- a Promise also moves from pending to fulfilled
or rejected.

We can consume Promises using:

-   `.then()` for success
-   `.catch()` for failure
-   `.finally()` for cleanup

And when dealing with multiple Promises, methods like `all`, `any`,
`race`, and `allSettled` help us control how results are handled.

Understanding Promises is the foundation for mastering modern JavaScript
--- and features like `async/await` are built on top of them.
