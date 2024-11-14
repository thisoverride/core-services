import { Socket } from "socket.io";
interface FFIEvent {
    chanel: string;

  }
export function logInfo(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {

        const event = propertyKey;
        (this as any).logInfo(`${event}`);
        return originalMethod.apply(this, args);
    };

    return descriptor;
}