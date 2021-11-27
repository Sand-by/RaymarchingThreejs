const fragmentShader = `
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float iScale;
mat2 scale(vec2 scale){
  return mat2(scale.x, 0.,0.,scale.y);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  vec2 coord = (gl_FragCoord.xy*2.0-iResolution.xy)/min(iResolution.x,iResolution.y);
  vec3 color = vec3(0.0);
  vec2 translate = vec2(-iMouse.x*1.95,-iMouse.y);
  coord+=translate;

  coord = scale(vec2(iScale))*coord;

  float zn = 0.03+(sin(iTime)*20.+1.)*0.005/2.;
  float zz = 0.03+(sin(iTime)*10.+1.)*0.005/2.;

  color += 0.3*0.3/length(coord);
  //color.b *= zn/length(coord);
  //color.g *= zz/length(coord);
  fragColor = vec4(vec3(color),1.0);
}

void main() {
   mainImage(gl_FragColor, gl_FragCoord.xy);
}`

export default fragmentShader;