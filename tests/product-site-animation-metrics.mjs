// SPDX-License-Identifier: GPL-3.0-only
// Classify actual opaque raster samples using the call site's exact palette.
export function pixelMetrics(before,after,face,stroke){
 if(before.length!==after.length||after.length%4||face.length!==3||stroke.length!==3)throw Error('Pixel/palette shape mismatch');
 let changedPixels=0,softEdgePixels=0,solidStrokePixels=0,offPalettePixels=0,nonOpaquePixels=0;const colours=new Set();
 for(let i=0;i<after.length;i+=4){const r=after[i],g=after[i+1],b=after[i+2];if(r!==before[i]||g!==before[i+1]||b!==before[i+2])changedPixels++;colours.add(r+','+g+','+b);if(after[i+3]!==255){nonOpaquePixels++;continue;}const background=r===face[0]&&g===face[1]&&b===face[2],solid=r===stroke[0]&&g===stroke[1]&&b===stroke[2];if(solid){solidStrokePixels++;continue;}if(background)continue;
  if(r>=Math.min(face[0],stroke[0])&&r<=Math.max(face[0],stroke[0])&&g>=Math.min(face[1],stroke[1])&&g<=Math.max(face[1],stroke[1])&&b>=Math.min(face[2],stroke[2])&&b<=Math.max(face[2],stroke[2]))softEdgePixels++;else offPalettePixels++;
 }
 return{changedPixels,softEdgePixels,solidStrokePixels,offPalettePixels,nonOpaquePixels,colours:colours.size};
}
