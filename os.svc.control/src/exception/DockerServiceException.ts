export default class DockerServiceException extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  }