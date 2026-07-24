export class ServiceRegistry {
  static instances = new Map();

  static register(key, instance) {
    this.instances.set(key, instance);
  }

  static get(key) {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(`ServiceLocator Registry error: No service registered for key "${key}"`);
    }
    return instance;
  }

  static clear() {
    this.instances.clear();
  }
}
