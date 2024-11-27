import { MonitorControl, Rotation } from './MonitorControl';



void (async () => {
  const dd= await MonitorControl.getMonitors()

  console.log(dd);
  

})()
