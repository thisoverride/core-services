import ExpressApp from "./framework/express/ExpressApp";

const port: number = 8003;
const expressApp = new ExpressApp();
expressApp.startEngine(port);
