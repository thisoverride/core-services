import LocationControl  from "./LocationControl"


void (async () => {

  try {
    const dd= await LocationControl.getCurrentLocation()
    console.log(dd);
    
  } catch (error) {
    console.log(error);
    
  }

  

})()
