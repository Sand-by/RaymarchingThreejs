const fragmentShader = `
#define MAX_STEPS 128
#define MIN_DISTANCE 0.01
#define MAX_DISTANCE 100.
#define PI 3.14159265359
uniform vec2 iResolution;
uniform float iSpeed;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 iSphereColor;
uniform vec3 iObjectColor;
uniform float iShadows;
uniform vec3 iRotate;
uniform int iContinuousRotate;
const vec4 GroundColor = vec4(1);
float colorIntensity = 1.;
vec3 difColor = vec3(1.0, 1.0, 1.0);

mat2 Rotate(float a) {
    float s=sin(a); 
    float c=cos(a);
    return mat2(c,-s,s,c);
}
vec3 roty(vec3 p,float angle){
  float s = sin(angle),c = cos(angle);
    mat3 rot = mat3(
      c, 0.,-s,
        0.,1., 0.,
        s, 0., c
    );
    return p*rot; 
}
mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(1, 0, 0),
        vec3(0, c, -s),
        vec3(0, s, c)
    );
}
mat3 rotateZ(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, -s, 0),
        vec3(s, c, 0),
        vec3(0, 0, 1)
    );
}
mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0, s),
        vec3(0, 1, 0),
        vec3(-s, 0, c)
    );
}
// Plane - exact
float planeSDF(vec3 p,vec4 n) {
    // n must be normalized
    return dot(p,n.xyz)+n.w;
}
float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
vec4 unionSDF(vec4 a, vec4 b) {
    return a.w < b.w? a : b;
}

//ADD OCTAHEDRON
float sdOctahedron( vec3 p, float s)
{
  p = abs(p);
  return (p.x+p.y+p.z-s)*0.57735027;
}
//ADD SPHERE
float sdSphere(vec3 p,float s){
    return length(p)-s;
}
vec4 differenceSDF(vec4 a, vec4 b) {
    float d = max(a.w, -b.w);
    return d == a.w ? a : vec4(b.rgb,-b.w);
}
vec4 map(vec3 p){
    float plane = dot(p,vec3(0.0,.0,-1.0))+3.728;//vec3 Rotation
    //BLUE SPHERE POSTIOIN
    vec3 spH = vec3(0.,sin(iSpeed*PI),0.);
    spH = p - spH;
	vec4 sphere = vec4(iSphereColor,sdSphere(spH,.8));

    // Plane
    vec4 p0 = vec4(GroundColor.rgb,plane);
    //Box
    //vec4 box = vec4(GroundColor.rgb,sdBox(p,vec3(5.)));
    //ROTATINON OF POS
    p*=rotateX(iRotate.x);
    p*= rotateY(iRotate.y);
    p*=rotateZ(iRotate.z);

    switch (iContinuousRotate) {
        case 1:
            p*=rotateX(-iSpeed*PI);//ROTATE POSITION
            break;
        case 2:
            p*=rotateY(-iSpeed*PI);
            break;
        case 3:
            p*=rotateZ(-iSpeed*PI);
            break;
        }

    p.y = abs(p.y);
    //SPHERE POSTION
    vec3 oJp = vec3(0.,1.5,0.000); // Position
    oJp = p - oJp;
    // Octahedron POSTION
    vec3 o0p = vec3(0.,0.,0.); // Position
    o0p = p - o0p;
    //o0p.xy *= Rotate(-iSpeed); // Rotate on one axis
   	// vec4 ll = vec4(SphereColor.rgb,sdSphere(oJp,1.8));
   	// vec4 pM = vec4(BoxColor.rgb,sdOctahedron(o0p,2.));
   	// vec4 mm = abs(differenceSDF(ll,pM));
    vec4 octWithsph = vec4(iObjectColor,max(sdOctahedron(o0p,2.),-sdSphere(oJp,1.8)));
   
    
    // Scene
    vec4 scene = vec4(0.);
    scene = unionSDF(p0,octWithsph);
    scene = unionSDF(scene,sphere);
	//scene = unionSDF(scene,abs(box*0.5));
    //scene = unionSDF(scene,pM);
    return scene;
}
float RayMarch(vec3 ro,vec3 rd, inout vec3 dColor){
    float dO=0.;
    for(int i=0;i<MAX_STEPS;i++)
    {
        if(dO>MAX_DISTANCE)
            break;
 
        vec3 p=ro+rd*dO;
        vec4 ds=vec4(map(p));
 
        if(ds.w<MIN_DISTANCE)
        {
            dColor = ds.rgb;
            break;
        }
        dO+=ds.w;
         
    }
    return dO;
}

vec3 GetNormal(vec3 p)
{
    float d=map(p).w;
    vec2 e=vec2(.01,0);
     
    vec3 n=d-vec3(
        map(p-e.xyy).w,
        map(p-e.yxy).w,
        map(p-e.yyx).w);
         
  return normalize(n);
}
     
vec3 diffuseLighting(vec3 p,vec3 c){
    vec3 color = c.rgb * colorIntensity;

    vec3 lightPosition = vec3(0,.5,-5.);
    vec3 light = normalize(lightPosition - p);
    vec3 normal = GetNormal(p);
    float diffuse = clamp(dot(normal,light),0.,1.);
     vec3 n=GetNormal(p);
    float d=RayMarch(p+n*MIN_DISTANCE*2.,light,difColor);
     
    if(d<length(light-p))diffuse*= iShadows;//SHADOWS
    return diffuse*color;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    
    vec2 st = gl_FragCoord.xy/iResolution;
    vec2 uv = st*2.0-1.0;
    uv.x *=1.5;
    vec3 rayOrigin = vec3(0.0,0.0,-3.500);//CAMERA
    vec3 rayDirection = normalize(vec3(uv,1.));//RAY DIRECTION
    //rayDirection = roty(rayDirection,iSpeed);
    //rayOrigin=roty(rayOrigin,iSpeed);
    rayDirection.zy *= Rotate(PI*iMouse.y*0.2);//CAMERA ROTATION
    rayDirection.xz *= Rotate(-PI*iMouse.x*0.2);//CAMERA ROTATION

    float d = RayMarch(rayOrigin,rayDirection,difColor);
    vec3 p = rayOrigin+rayDirection*d;
    vec3 color = diffuseLighting(p,difColor);

    
    fragColor = vec4(color,1.);
}

void main() {
   mainImage(gl_FragColor, gl_FragCoord.xy);
}`

export default fragmentShader;