//import  fragmentShader  from '../shaders/fragment.js';
import fragmentShader  from '../shaders/raymarching.js';
import { GUI } from '../libs/lil-gui/dist/lil-gui.esm.js';
const canvas = document.querySelector('#c');
const uniforms = {
  iSpeed: { value: 0 },
  iTime: {value: 0},
  iResolution: { value: new THREE.Vector3()},
  iMouse:{ value: new THREE.Vector2()} ,
  iScale: { value: 0 },
  iSphereColor: { value:new THREE.Vector3(0.5,0.3,0.7) },
  iObjectColor: { value:new THREE.Vector3(0.5,0.3,0.7) },
  iRotate:{value:new THREE.Vector3(0.34,0,0)},
  iShadows: {value: 1},
  iContinuousRotate:{value:0}
};

const renderer = new THREE.WebGLRenderer({ canvas });
const scene = new THREE.Scene();
var camera = new THREE.OrthographicCamera();
var mouse = new THREE.Vector2()
document.addEventListener('mousemove', onDocumentMouseMove, false);
//Audiodataarray
var analyser, dataArray=0;
const gui = new GUI();
var ContinuesTime = 0;

function init() {
        renderer.autoClearColor = false;
        camera = new THREE.OrthographicCamera(
              -1, // left
              1, // right
              1, // top
              -1, // bottom
              -1, // near,
              1, // far
        );

        const plane = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({fragmentShader,uniforms});
        const mesh = new THREE.Mesh(plane, material)
        scene.add(mesh);
}
//________________________________________________________________________________________
// ***** Setup (renderer): *****
        //gui.add( document, 'title' );
        
        var obj = {
          SphereColor: { r: 255, g: 0, b: 0 },
          ObjectColor: {r: 125, g: 34, b: 180},
          RotateX: 0.34,
          RotateY: 3.1415,
          RotateZ: 3.1415,
          ContRotate: 1,
          Start: function() {
            navigator.mediaDevices.getUserMedia( { audio: true, video: false } ).then( handleSuccess );
            var listener = new THREE.AudioListener();
            var audio = new THREE.Audio( listener );
            var fftSize = 2048;

            function handleSuccess( stream ) {
              var context = listener.context;
              var source = context.createMediaStreamSource( stream );
              audio.setNodeSource( source );
            }

            audio.gain.disconnect();//DISABLE FEEDBACK
            analyser = new THREE.AudioAnalyser(audio,fftSize)
            analyser.analyser.maxDecibels = -3;
            analyser.analyser.minDecibels = -100;
            dataArray = analyser.data;
            LowPassSpect();
            render();
          },
          OrbitControl_x: 0,
          OrbitControl_y: 0,
          EnableOrbit: false,
          EnableShadows: false,
          NumberOfSamples:1,
          SpeedOfMotion:0.02
        }   
        
        gui.add( obj, 'Start' ); 	// button
        gui.addColor( obj, 'SphereColor' ).onChange( value => {
          uniforms.iSphereColor.value.set(value.r,value.g,value.b);
        } );
        gui.addColor( obj, 'ObjectColor' ).onChange( value => {
          uniforms.iObjectColor.value.set(value.r,value.g,value.b);
        } );

        gui.add(obj,'RotateX',0,3.1415,0.01).onChange( value => {
          uniforms.iRotate.value.x = value;
        } );
        gui.add(obj,'RotateY',0,3.1415,0.01).onChange( value => {
          uniforms.iRotate.value.y = value;
        } );
        gui.add(obj,'RotateZ',0,3.1415,0.01).onChange( value => {
          uniforms.iRotate.value.z = value;
        } );
        gui.add(obj,'ContRotate',{Rotx:1,Roty:2,Rotz:3}).onChange( function( v ) {
          uniforms.iContinuousRotate.value = v;
        } );

        const folder = gui.addFolder( 'Camera' );
        folder.add( obj, 'OrbitControl_x' ).listen();
        folder.add( obj, 'OrbitControl_y' ).listen();
        folder.add(obj,'EnableOrbit');
        folder.add(obj,'EnableShadows').onChange(value=>{
          value? uniforms.iShadows.value = 0.2 : uniforms.iShadows.value = 1.
        });

        const folder2 = gui.addFolder( 'Lowpass' );
        folder2.add(obj,'NumberOfSamples',1,50,1)
        folder2.add(obj,'SpeedOfMotion',0.00,1,0.01);

//---------------------------------------------------------------------
function onDocumentMouseMove(event) {
          event.preventDefault();

          if(folder.controllers[2].object.EnableOrbit){
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            obj.OrbitControl_x = mouse.x;
            obj.OrbitControl_y = mouse.y;

          }
          else {
            mouse.x = 0;
            mouse.y = 0;
          }
          
}

function resizeRendererToDisplaySize(renderer){
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
          renderer.setSize(width, height, false);
        }
        return needResize;
}

function map_range(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}
//RMS FUNCTION
function LowPassSpect(){
  let square = 0;
  let mean = 0.0, root = 0.0;
  for (let i = 0; i < folder2.controllers[0].object.NumberOfSamples; i++) {
    if(dataArray!=0)
      square += Math.pow(dataArray[i], 2);
    }
  mean = (square / folder2.controllers[0].object.NumberOfSamples);
  root = Math.sqrt(mean);
  return root;
}

function render(time) {
        resizeRendererToDisplaySize(renderer);
        if(dataArray!=0) analyser.getFrequencyData();
        time *= 0.001;  // convert to seconds

        const lowpass = LowPassSpect();
        ContinuesTime += map_range(lowpass,0,140,0.0,.07);//REMAP INPUT VALUE
        uniforms.iSpeed.value = ContinuesTime * folder2.controllers[1].object.SpeedOfMotion;
        uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
        //uniforms.iTime.value = time;
        const scale = map_range(lowpass,0,200,.8,.002);
        uniforms.iScale.value = scale
        uniforms.iMouse.value.set(mouse.x,mouse.y);
        renderer.render(scene, camera);
       //console.log(lowpass)
        requestAnimationFrame(render);
}
requestAnimationFrame(render);

init();