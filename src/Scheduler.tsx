type ScheduledUpdate = {
  id?: string,
  callback: Function,
  scheduledTime: Date,
}

let scheduledUpdates: ScheduledUpdate[] = [];

export function scheduleUpdate(update: ScheduledUpdate) {
  if (update.scheduledTime.toString() === "Invalid Date") {
    throw new Error("Can't schedule for an invalid date")
  }
  scheduledUpdates.push(update);
}

export function scheduleForLater(callback: Function, seconds: number) {
  const due = new Date();
  due.setSeconds(due.getSeconds() + seconds)
  scheduledUpdates.push({
    callback,
    scheduledTime: due
  });
}

export function processUpdatesLoop() {
  const now = new Date();
  const nextUpdates = [];
  for (const update of scheduledUpdates) {
    if (now < update.scheduledTime) { nextUpdates.push(update); console.log(`Re-queueing update until ${update.scheduledTime}`) }
    else { update.callback(); }
  }
  console.log({
    curr: scheduledUpdates,
    next: nextUpdates
  })
  scheduledUpdates = nextUpdates;
  // Process updates every 1/2 of a second
  setTimeout(processUpdatesLoop, 500);
}
