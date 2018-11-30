# Queue

JavaScript queue library

## Quick Start

```bash
  npm install coxmediagroup/queue
```

```js
const { Queue } = require('@coxmediagroup/queue');

// Create a new Queue
const queue = new Queue();

// Example function to be queued and run
const fn = (input1, input2) => `${input1} ${input2}`;

// Put a function and its parameters onto the queue
queue.put(fn, ['hello', 'world!']));

// Optionally, if the results are needed externally,
// Then you can track the queue item
const queueItem = queue.put(fn, ['hello', 'world!']));

// Listen for the queue "stop" event
queue.once('stop', () => {
  console.log(queueItem.results); // 'hello world!'
});
```
