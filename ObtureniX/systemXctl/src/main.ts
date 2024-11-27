// import { SystemXControl } from "./systemXCtrl";

import { SystemXControl } from "../build/lib/SystemXControl";

// SystemXControl.shutdown()

// SystemXControl.getStatus().then((res) => console.log(res)) //OK
// SystemXControl.healthCheck().then((res) => console.log(res)) //OK
// SystemXControl.sleep() //OK 
// SystemXControl.restart() KO
SystemXControl.shutdown()

