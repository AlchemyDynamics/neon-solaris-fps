export const Status = {
  SUCCESS: "success",
  FAILURE: "failure",
  RUNNING: "running"
};

export class Selector {
  constructor(children) {
    this.children = children;
  }

  tick(context) {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== Status.FAILURE) return status;
    }
    return Status.FAILURE;
  }
}

export class Sequence {
  constructor(children) {
    this.children = children;
  }

  tick(context) {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== Status.SUCCESS) return status;
    }
    return Status.SUCCESS;
  }
}

export class Condition {
  constructor(test) {
    this.test = test;
  }

  tick(context) {
    return this.test(context) ? Status.SUCCESS : Status.FAILURE;
  }
}

export class Action {
  constructor(run) {
    this.run = run;
  }

  tick(context) {
    return this.run(context) ?? Status.SUCCESS;
  }
}

export class Cooldown {
  constructor(seconds, child) {
    this.seconds = seconds;
    this.child = child;
    this.remaining = 0;
  }

  tick(context) {
    this.remaining = Math.max(0, this.remaining - context.dt);
    if (this.remaining > 0) return Status.FAILURE;
    const status = this.child.tick(context);
    if (status === Status.SUCCESS) this.remaining = this.seconds;
    return status;
  }
}

export function condition(test) {
  return new Condition(test);
}

export function action(run) {
  return new Action(run);
}
