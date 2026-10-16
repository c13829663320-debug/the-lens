const COLORS={bg:'#0c1010',paper:'#e9e3d5',muted:'#a7aaa0',accent:'#cbb98c',line:'#53605b'};
function rect(ctx,x,y,w,h,fill,stroke,r=0){ctx.beginPath();if(r&&ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(ctx,value,x,y,size=16,color=COLORS.paper,align='left',font='sans-serif'){ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(String(value),x,y);}
function wrap(ctx,value,x,y,maxWidth,size=17,color=COLORS.paper,line=27,maxLines=20){ctx.font=`${size}px sans-serif`;let out='',row=0;for(const ch of String(value)){if(ch==='\n'||ctx.measureText(out+ch).width>maxWidth){text(ctx,out,x,y+row*line,size,color);out=ch==='\n'?'':ch;row++;if(row>=maxLines)return row*line;}else out+=ch;}if(out)text(ctx,out,x,y+row++*line,size,color);return row*line;}
function cover(ctx,img,x,y,w,h){if(!img)return;const ratio=Math.max(w/img.width,h/img.height),sw=w/ratio,sh=h/ratio;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);}
function containFrame(img,x,y,w,h){if(!img||!img.width||!img.height)return{x,y,w,h};const ratio=Math.min(w/img.width,h/img.height),dw=img.width*ratio,dh=img.height*ratio;return{x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};}
function contain(ctx,img,x,y,w,h,fill){if(!img)return;const frame=containFrame(img,x,y,w,h);if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h);}
function circle(ctx,x,y,r,stroke,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke();}}
module.exports={COLORS,rect,text,wrap,cover,contain,containFrame,circle};
