type ScheduledUpdate = {
  id?: string,
  callback: Function,
  scheduledTime: Date,
}

let scheduledUpdates: ScheduledUpdate[] = [];

export function scheduleUpdate(update: ScheduledUpdate) {
  scheduledUpdates.push(update);
}

export function processUpdatesLoop() {
  const now = new Date();
  const nextUpdates = [];
  for (const update of scheduledUpdates) {
    if (now < update.scheduledTime) { nextUpdates.push(update); continue; }
    else { update.callback(); }
  }
  scheduledUpdates = nextUpdates;
  // Process updates every 1/2 of a second
  setTimeout(processUpdatesLoop, 500);
}
