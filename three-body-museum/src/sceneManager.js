export class SceneManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.scenes = {};
    this.current = null;
  }

  registerScenes(map) {
    this.scenes = { ...map };
  }

  switchTo(name) {
    const factory = this.scenes[name];
    if (!factory) return;

    if (this.current && this.current.onExit) {
      this.current.onExit();
    }
    if (this.current && this.current.group) {
      this.ctx.scene.remove(this.current.group);
    }

    const next = factory(this.ctx);
    this.current = next;
    if (next.group) {
      this.ctx.scene.add(next.group);
    }
    if (next.onEnter) next.onEnter();
  }

  update(delta, elapsed) {
    if (this.current && this.current.update) {
      this.current.update(delta, elapsed);
    }
  }
}