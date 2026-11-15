// Pure planning only: no navigator access, permissions, pairing, network or MIDI writes.
export function connectionPlan(api={},firmware={}){
 const secure=api.secure===true,midi=api.midi===true,ble=api.bluetooth===true;
 const transports=new Set(firmware.transports??[]),admitted=firmware.admitted===true;
 return Object.freeze({
  systemMidi:Object.freeze({label:'USB or system MIDI port',canRequest:secure&&midi,canControl:false,requiresUserAction:true,requiresEndpointVerification:true,transport:'unknown-until-endpoint-verification',firmwareTransports:[...transports],firmwareAdmitted:admitted,message:midi?'Choose an input/output pair, then verify the instrument. A port name is not its transport or identity.':'Use a browser with MIDI access or an explicitly supported native MIDI host.'}),
  directBle:Object.freeze({label:'Bluetooth MIDI directly',canRequest:secure&&ble&&admitted&&transports.has('ble'),canControl:false,requiresUserAction:true,requiresEndpointVerification:true,message:!ble?'This browser does not expose direct Bluetooth access.':!admitted||!transports.has('ble')?'Bluetooth remote is awaiting the firmware transport integration.':'Select the instrument explicitly, then verify its remote endpoint.'}),
  nativeBridge:Object.freeze({label:'Native MIDI host',canRequest:api.bridgeAvailable===true&&secure,canControl:false,requiresEndpointVerification:true,message:api.bridgeAvailable===true?'Verify the explicitly connected native MIDI host and instrument.':'A native MIDI host is a platform route, not an installed feature of this page.'})
 });
}
