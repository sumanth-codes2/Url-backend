export class BaseAIService {
  constructor(serviceName) {
    this.serviceName = serviceName;
  }

  getServiceName() {
    return this.serviceName;
  }
}
